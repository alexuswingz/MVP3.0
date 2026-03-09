from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.core.cache import cache
from django.db.models import Count, Q, Sum, Prefetch
from django.db import connection
from django.http import HttpResponse
from datetime import date
from io import StringIO
import time
import math
import csv

from config.pagination import ProductPagination
from .models import (
    Brand, Product, PackagingType, Closure, Formula,
    DOISettings, ForecastCache, ProductExtended
)
from .serializers import (
    BrandSerializer, ProductListSerializer, ProductDetailSerializer,
    ProductCreateUpdateSerializer, PackagingTypeSerializer,
    ClosureSerializer, FormulaSerializer, DOISettingsSerializer,
    ForecastCacheSerializer
)
from .services import ForecastService, DEFAULT_SETTINGS
from .services.algorithms import (
    calculate_forecast_18m_plus,
    calculate_forecast_6_18m,
    calculate_forecast_0_6m,
)
from analytics_app.models import WeeklySales
from inventory_app.models import LabelInventory, CurrentInventory


# Pallet Calculator Constants (Amazon FBA defaults)
PALLET_LENGTH = 48  # inches
PALLET_WIDTH = 40   # inches
PALLET_HEIGHT = 5.5  # inches (pallet tare height)
PALLET_TARE_WEIGHT = 30  # lbs
MAX_PALLET_WEIGHT = 1500  # lbs (FBA limit)
MAX_PALLET_HEIGHT_FBA = 72  # inches (FBA limit)
MAX_PALLET_HEIGHT_AWD = 60  # inches (AWD limit)

# Default case dimensions if not specified
DEFAULT_CASE_LENGTH = 12  # inches
DEFAULT_CASE_WIDTH = 10   # inches
DEFAULT_CASE_HEIGHT = 12  # inches
DEFAULT_CASE_WEIGHT = 25  # lbs
DEFAULT_UNITS_PER_CASE = 12


def calculate_pallets_needed(
    total_units: int,
    case_length: float = DEFAULT_CASE_LENGTH,
    case_width: float = DEFAULT_CASE_WIDTH,
    case_height: float = DEFAULT_CASE_HEIGHT,
    case_weight: float = DEFAULT_CASE_WEIGHT,
    units_per_case: int = DEFAULT_UNITS_PER_CASE,
    program: str = 'FBA'
) -> dict:
    """
    Calculate pallets needed based on Amazon pallet calculator logic.
    
    Args:
        total_units: Total units to ship
        case_length, case_width, case_height: Case dimensions in inches
        case_weight: Case weight in lbs
        units_per_case: Units per case
        program: 'FBA' or 'AWD' (affects max pallet height)
    
    Returns:
        dict with calculation details
    """
    if total_units <= 0 or units_per_case <= 0:
        return {
            'pallets_needed': 0,
            'pallets_decimal': 0,
            'total_cases': 0,
            'cases_per_pallet': 0,
            'details': {}
        }
    
    # Calculate total cases needed
    total_cases = math.ceil(total_units / units_per_case)
    
    # Max pallet height based on program
    max_pallet_height = MAX_PALLET_HEIGHT_FBA if program == 'FBA' else MAX_PALLET_HEIGHT_AWD
    max_pallet_height_used = max_pallet_height - PALLET_HEIGHT  # Subtract pallet tare height
    
    # Cases per layer (heuristic: floor division of pallet area by case footprint)
    # This is simplified - actual calculation considers orientation
    pallet_area = PALLET_LENGTH * PALLET_WIDTH
    case_footprint = case_length * case_width
    cases_per_layer = max(1, int(pallet_area / case_footprint))
    
    # Max layers by height
    max_layers_by_height = max(1, int(max_pallet_height_used / case_height))
    
    # Max cases per pallet by height
    max_cases_by_height = cases_per_layer * max_layers_by_height
    
    # Max cases per pallet by weight
    available_weight = MAX_PALLET_WEIGHT - PALLET_TARE_WEIGHT
    max_cases_by_weight = max(1, int(available_weight / case_weight)) if case_weight > 0 else max_cases_by_height
    
    # Usable cases per pallet (minimum of height and weight limits)
    usable_cases_per_pallet = min(max_cases_by_height, max_cases_by_weight)
    
    # Calculate pallets needed
    pallets_needed = math.ceil(total_cases / usable_cases_per_pallet) if usable_cases_per_pallet > 0 else 0
    
    return {
        'pallets_needed': round(pallets_needed, 2),
        'pallets_decimal': round(total_cases / usable_cases_per_pallet, 2) if usable_cases_per_pallet > 0 else 0,
        'total_cases': total_cases,
        'cases_per_pallet': usable_cases_per_pallet,
        'details': {
            'cases_per_layer': cases_per_layer,
            'max_layers': max_layers_by_height,
            'max_cases_by_height': max_cases_by_height,
            'max_cases_by_weight': max_cases_by_weight,
            'max_pallet_height': max_pallet_height,
        }
    }


class BrandViewSet(viewsets.ModelViewSet):
    serializer_class = BrandSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Brand.objects.filter(user=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ProductPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'brand', 'is_active', 'is_hazmat']
    search_fields = ['name', 'asin', 'sku', 'upc']
    ordering_fields = ['name', 'created_at', 'launch_date', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        qs = Product.objects.filter(user=self.request.user)
        
        # Only join tables when needed
        if self.action == 'list':
            return qs.select_related('brand').only(
                'id', 'asin', 'parent_asin', 'sku', 'upc', 'name', 'size',
                'product_type', 'category', 'status', 'launch_date', 
                'image_url', 'is_hazmat', 'is_active', 'brand_id',
                'brand__name', 'created_at', 'updated_at'
            )
        elif self.action == 'retrieve':
            return qs.select_related('brand').prefetch_related('extended')
        return qs.select_related('brand')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProductCreateUpdateSerializer
        return ProductDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        # Invalidate stats cache when product is created
        cache.delete(f'product_stats_{self.request.user.id}')
    
    def perform_update(self, serializer):
        serializer.save()
        # Invalidate stats cache when product is updated
        cache.delete(f'product_stats_{self.request.user.id}')
    
    def perform_destroy(self, instance):
        instance.delete()
        # Invalidate stats cache when product is deleted
        cache.delete(f'product_stats_{self.request.user.id}')
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get product statistics - cached and optimized with single aggregation query"""
        cache_key = f'product_stats_{request.user.id}'
        cached_stats = cache.get(cache_key)
        
        if cached_stats:
            return Response(cached_stats)
        
        stats = Product.objects.filter(user=request.user).aggregate(
            total=Count('id'),
            active=Count('id', filter=Q(is_active=True)),
            launched=Count('id', filter=Q(status='launched')),
            pending=Count('id', filter=Q(status='pending')),
            discontinued=Count('id', filter=Q(status='discontinued')),
            draft=Count('id', filter=Q(status='draft')),
        )
        
        result = {
            'total_products': stats['total'],
            'active_products': stats['active'],
            'launched_products': stats['launched'],
            'by_status': {
                'launched': stats['launched'],
                'pending': stats['pending'],
                'discontinued': stats['discontinued'],
                'draft': stats['draft'],
            }
        }
        
        # Cache for 5 minutes
        cache.set(cache_key, result, 300)
        
        return Response(result)

    @action(detail=False, methods=['get'])
    def export(self, request):
        """
        Export products as CSV.

        Applies the same filters/search/order as the list endpoint, but returns
        all matching rows without pagination.
        """
        queryset = self.filter_queryset(self.get_queryset())

        # Ensure we have brand data for CSV without extra queries
        queryset = queryset.select_related('brand')

        buffer = StringIO()
        writer = csv.writer(buffer)

        # Match columns currently used by the frontend export
        writer.writerow(
            ['Status', 'Product Name', 'ASIN', 'SKU', 'Brand', 'Size', 'Marketplace', 'Seller Account']
        )

        for product in queryset:
            status_label = 'Active' if product.is_active else 'Inactive'
            writer.writerow(
                [
                    status_label,
                    product.name or '',
                    product.asin or '',
                    product.sku or '',
                    product.brand.name if getattr(product, 'brand', None) else '',
                    product.size or '',
                    'Amazon',
                    'TPS Nutrients',
                ]
            )

        buffer.seek(0)
        filename = f'products_export_{date.today().isoformat()}.csv'
        response = HttpResponse(buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class PackagingTypeViewSet(viewsets.ModelViewSet):
    serializer_class = PackagingTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PackagingType.objects.filter(user=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ClosureViewSet(viewsets.ModelViewSet):
    serializer_class = ClosureSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Closure.objects.filter(user=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FormulaViewSet(viewsets.ModelViewSet):
    serializer_class = FormulaSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Formula.objects.filter(user=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DOISettingsViewSet(viewsets.ModelViewSet):
    serializer_class = DOISettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DOISettings.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def default(self, request):
        """Get default DOI settings"""
        settings = self.get_queryset().filter(is_default=True).first()
        if not settings:
            settings = DOISettings.objects.create(
                user=request.user,
                name='Default',
                is_default=True
            )
        return Response(DOISettingsSerializer(settings).data)


class ForecastViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ForecastCacheSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'product']
    ordering_fields = ['forecast_date', 'current_doi', 'units_to_make']
    ordering = ['-forecast_date']
    
    def get_queryset(self):
        return ForecastCache.objects.filter(
            product__user=self.request.user
        ).select_related('product')
    
    @action(detail=False, methods=['get'])
    def table(self, request):
        """
        Get forecast table data for all products with real calculations.
        This is the main API for the forecast dashboard.
        
        Query params:
        - search: Filter by product name or ASIN
        - brand: Filter by brand ID
        - status: Filter by product status
        - sort_by: Sort field (doi, units_to_make, inventory, name)
        - sort_order: asc or desc
        """
        start_time = time.time()
        
        # Get filter params
        search = request.query_params.get('search', '').strip()
        brand_id = request.query_params.get('brand')
        product_status = request.query_params.get('status')
        sort_by = request.query_params.get('sort_by', 'doi')
        sort_order = request.query_params.get('sort_order', 'asc')
        
        # Get user's DOI settings
        doi_settings = DOISettings.objects.filter(
            user=request.user, 
            is_default=True
        ).first()
        
        settings = {
            'amazon_doi_goal': doi_settings.amazon_doi_goal if doi_settings else 93,
            'inbound_lead_time': doi_settings.inbound_lead_time if doi_settings else 30,
            'manufacture_lead_time': doi_settings.manufacture_lead_time if doi_settings else 7,
            'market_adjustment': doi_settings.market_adjustment if doi_settings else 0.05,
            'velocity_weight': doi_settings.velocity_weight if doi_settings else 0.15,
        }
        doi_threshold = settings['amazon_doi_goal'] + settings['inbound_lead_time'] + settings['manufacture_lead_time']
        
        # Get current inventory for all products in one query
        current_inventory = {
            ci.product_id: {
                'fba_available': ci.fba_available,
                'fba_reserved': ci.fba_reserved,
                'fba_inbound': ci.fba_inbound,
                'fba_total': ci.fba_total,
                'awd_available': ci.awd_available,
                'awd_reserved': ci.awd_reserved,
                'awd_inbound': ci.awd_inbound,
                'awd_outbound_to_fba': ci.awd_outbound_to_fba,
                'awd_total': ci.awd_total,
                'total_inventory': ci.total_inventory,
                'days_of_supply': ci.days_of_supply,
            }
            for ci in CurrentInventory.objects.filter(product__user=request.user)
        }
        
        # Get products with aggregated sales data in a single query
        from django.db.models import Max, Min, Avg, Count as DjCount, Subquery, OuterRef
        from analytics_app.models import WeeklySales
        
        # Subquery to get first week with actual sales (units_sold > 0)
        first_sale_subquery = WeeklySales.objects.filter(
            product=OuterRef('pk'),
            units_sold__gt=0
        ).order_by('week_ending').values('week_ending')[:1]
        
        products_with_sales = Product.objects.filter(
            user=request.user,
            is_active=True,
            weekly_sales__isnull=False
        ).select_related('brand').annotate(
            weeks_of_data=DjCount('weekly_sales'),
            latest_week=Max('weekly_sales__week_ending'),
            first_sale_week=Subquery(first_sale_subquery),  # First week with units_sold > 0
            avg_weekly_sales=Avg('weekly_sales__units_sold'),
            total_sales=Sum('weekly_sales__units_sold'),
        ).distinct()
        
        # Apply filters
        if search:
            products_with_sales = products_with_sales.filter(
                Q(name__icontains=search) | 
                Q(asin__icontains=search) |
                Q(sku__icontains=search)
            )
        if brand_id:
            products_with_sales = products_with_sales.filter(brand_id=brand_id)
        if product_status:
            products_with_sales = products_with_sales.filter(status=product_status)
        
        # No pagination - load all products
        
        # Convert to list for multiple iterations
        products_list = list(products_with_sales)
        product_ids = [p.id for p in products_list]
        
        # Prefetch seasonality data for all products in one query (fixes N+1)
        from analytics_app.models import ProductSeasonality
        products_with_seasonality = set(
            ProductSeasonality.objects.filter(product_id__in=product_ids)
            .values_list('product_id', flat=True)
        )
        
        # Prefetch weekly sales count per product (for has_prior_year_data check)
        # Only fetch full data for 18m+ products that need it
        weekly_sales_counts = {}
        for sale in WeeklySales.objects.filter(product_id__in=product_ids).values('product_id').annotate(
            count=DjCount('id')
        ):
            weekly_sales_counts[sale['product_id']] = sale['count']
        
        # Build forecast rows using optimized calculations
        forecast_rows = []
        today = date.today()
        DAYS_PER_MONTH = 30.44
        
        from datetime import timedelta
        
        # Pre-calculate common values
        market_adj = settings.get('market_adjustment', 0.05)
        velocity_adj = settings.get('velocity_weight', 0.15) * 0.10
        lead_time_weeks = doi_threshold / 7
        
        # Products that need full weekly data for 18m+ algorithm
        products_needing_weekly_data = []
        
        for product in products_list:
            # Get inventory data
            inv = current_inventory.get(product.id, {})
            total_inventory = inv.get('total_inventory', 0)
            fba_available = inv.get('fba_available', 0)
            fba_total = inv.get('fba_total', 0)
            awd_available = inv.get('awd_available', 0)
            awd_total = inv.get('awd_total', 0)
            
            # Determine algorithm based on product age
            first_sale_date = product.first_sale_week or product.launch_date
            if first_sale_date:
                days_since = (today - first_sale_date).days
                age_months = days_since / DAYS_PER_MONTH
                if age_months < 6:
                    algorithm = '0-6m'
                elif age_months < 18:
                    algorithm = '6-18m'
                else:
                    algorithm = '18m+'
            else:
                algorithm = '18m+'
            
            avg_weekly = product.avg_weekly_sales or 0
            weeks_count = weekly_sales_counts.get(product.id, 0)
            has_prior_year_data = weeks_count >= 52
            
            # Check seasonality using prefetched data (no DB query!)
            needs_seasonality = False
            if algorithm in ['0-6m', '6-18m']:
                needs_seasonality = product.id not in products_with_seasonality
            
            # Initialize forecast values
            doi_total = None
            doi_fba = None
            total_units_needed = None
            units_to_make = None
            runout_date = None
            
            # For products that need seasonality, skip forecast calculation
            if needs_seasonality:
                pass  # Keep values as None
            # For 18m+ with prior year data, mark for batch processing
            elif has_prior_year_data and algorithm == '18m+':
                products_needing_weekly_data.append(product.id)
            # For products without prior year data, use velocity-based forecast
            else:
                adjusted_weekly = avg_weekly * (1 + market_adj + velocity_adj)
                
                if adjusted_weekly > 0:
                    daily_sales = adjusted_weekly / 7
                    doi_total = int(total_inventory / daily_sales) if daily_sales > 0 else 365
                    doi_fba = int(fba_total / daily_sales) if daily_sales > 0 and fba_total > 0 else 0
                    total_units_needed = int(adjusted_weekly * lead_time_weeks)
                    units_to_make = max(0, total_units_needed - total_inventory)
                    days_until_runout = total_inventory / daily_sales if daily_sales > 0 else 365
                    runout_date = (today + timedelta(days=days_until_runout)).isoformat()
                else:
                    doi_total = 365
                    doi_fba = 365
                    total_units_needed = 0
                    units_to_make = 0
                    runout_date = None
            
            forecast_rows.append({
                '_product_id': product.id,  # Temporary field for batch processing
                '_algorithm': algorithm,
                '_has_prior_year_data': has_prior_year_data,
                '_inv': inv,
                'product': product,
                'needs_seasonality': needs_seasonality,
                'doi_total': doi_total,
                'doi_fba': doi_fba,
                'total_units_needed': total_units_needed,
                'units_to_make': units_to_make,
                'runout_date': runout_date,
                'avg_weekly': avg_weekly,
            })
        
        # Batch fetch weekly data only for products that need 18m+ algorithm
        if products_needing_weekly_data:
            weekly_sales_data = {}
            for sale in WeeklySales.objects.filter(
                product_id__in=products_needing_weekly_data
            ).order_by('product_id', 'week_ending'):
                if sale.product_id not in weekly_sales_data:
                    weekly_sales_data[sale.product_id] = []
                weekly_sales_data[sale.product_id].append({
                    'week_end': sale.week_ending,
                    'units_sold': sale.units_sold,
                })
            
            # Process 18m+ products with full algorithm
            for row in forecast_rows:
                if row['_product_id'] in products_needing_weekly_data:
                    product_id = row['_product_id']
                    inv = row['_inv']
                    units_data = weekly_sales_data.get(product_id, [])
                    
                    algo_settings = {
                        **settings,
                        'total_inventory': inv.get('total_inventory', 0),
                        'fba_available': inv.get('fba_available', 0),
                    }
                    
                    try:
                        forecast_result = calculate_forecast_18m_plus(
                            units_data, today, algo_settings
                        )
                        row['units_to_make'] = forecast_result['units_to_make']
                        row['doi_total'] = forecast_result['doi_total_days']
                        row['doi_fba'] = forecast_result['doi_fba_days']
                        row['total_units_needed'] = forecast_result['total_units_needed']
                        runout = forecast_result.get('runout_date_total')
                        row['runout_date'] = runout.isoformat() if runout and hasattr(runout, 'isoformat') else str(runout) if runout else None
                    except Exception:
                        # Fallback to velocity-based
                        avg_weekly = row['avg_weekly']
                        total_inventory = inv.get('total_inventory', 0)
                        fba_total = inv.get('fba_total', 0)
                        adjusted_weekly = avg_weekly * (1 + market_adj + velocity_adj)
                        
                        if adjusted_weekly > 0:
                            daily_sales = adjusted_weekly / 7
                            row['doi_total'] = int(total_inventory / daily_sales) if daily_sales > 0 else 365
                            row['doi_fba'] = int(fba_total / daily_sales) if daily_sales > 0 and fba_total > 0 else 0
                            row['total_units_needed'] = int(adjusted_weekly * lead_time_weeks)
                            row['units_to_make'] = max(0, row['total_units_needed'] - total_inventory)
                            days_until_runout = total_inventory / daily_sales if daily_sales > 0 else 365
                            row['runout_date'] = (today + timedelta(days=days_until_runout)).isoformat()
                        else:
                            row['doi_total'] = 365
                            row['doi_fba'] = 365
                            row['total_units_needed'] = 0
                            row['units_to_make'] = 0
                            row['runout_date'] = None
        
        # Build final response rows
        final_rows = []
        for row in forecast_rows:
            product = row['product']
            inv = row['_inv']
            first_sale_date = product.first_sale_week or product.launch_date
            
            final_rows.append({
                'product': {
                    'id': str(product.id),
                    'asin': product.asin,
                    'sku': product.sku or '',
                    'name': product.name,
                    'brand': product.brand.name if product.brand else '',
                    'size': product.size or '',
                    'category': product.category or '',
                    'status': product.status,
                    'imageUrl': product.image_url or '',
                    'launchDate': first_sale_date.isoformat() if first_sale_date else None,
                },
                'inventory': {
                    'total': inv.get('total_inventory', 0),
                    'fbaAvailable': inv.get('fba_available', 0),
                    'fbaTotal': inv.get('fba_total', 0),
                    'awdAvailable': inv.get('awd_available', 0),
                    'awdTotal': inv.get('awd_total', 0),
                },
                'unitsToMake': row['units_to_make'],
                'daysOfInventory': row['doi_total'],
                'doiFba': row['doi_fba'],
                'runoutDate': row['runout_date'],
                'totalUnitsNeeded': row['total_units_needed'],
                'weeksOfData': product.weeks_of_data or 0,
                'avgWeeklySales': round(row['avg_weekly'], 1) if row['avg_weekly'] else 0,
                'algorithm': row['_algorithm'],
                'needsSeasonality': row['needs_seasonality'],
            })
        
        # Sort results (handle None values by putting them at the end)
        if sort_by == 'doi':
            default_val = float('inf') if sort_order == 'asc' else float('-inf')
            final_rows.sort(key=lambda x: x['daysOfInventory'] if x['daysOfInventory'] is not None else default_val, reverse=(sort_order == 'desc'))
        elif sort_by == 'units_to_make':
            default_val = float('inf') if sort_order == 'asc' else float('-inf')
            final_rows.sort(key=lambda x: x['unitsToMake'] if x['unitsToMake'] is not None else default_val, reverse=(sort_order == 'desc'))
        elif sort_by == 'inventory':
            final_rows.sort(key=lambda x: x['inventory']['total'], reverse=(sort_order == 'desc'))
        elif sort_by == 'name':
            final_rows.sort(key=lambda x: x['product']['name'].lower(), reverse=(sort_order == 'desc'))
        
        # Calculate summary stats (exclude None values)
        rows_with_forecast = [r for r in final_rows if r['unitsToMake'] is not None]
        total_units_to_make = sum(r['unitsToMake'] for r in rows_with_forecast)
        
        rows_with_doi = [r for r in final_rows if r['daysOfInventory'] is not None]
        avg_doi = sum(r['daysOfInventory'] for r in rows_with_doi) / len(rows_with_doi) if rows_with_doi else 0
        products_at_risk = sum(1 for r in rows_with_doi if r['daysOfInventory'] < doi_threshold)
        
        # Calculate total DOI (inventory-weighted average, excluding None values)
        total_inventory_all = sum(r['inventory']['total'] for r in rows_with_doi)
        if total_inventory_all > 0:
            weighted_doi = sum(r['daysOfInventory'] * r['inventory']['total'] for r in rows_with_doi) / total_inventory_all
            total_doi = round(weighted_doi)
        else:
            total_doi = round(avg_doi)
        
        # Get case dimensions for pallet calculation
        final_product_ids = [int(r['product']['id']) for r in final_rows]
        extended_data = {
            pe.product_id: pe 
            for pe in ProductExtended.objects.filter(product_id__in=final_product_ids)
        }
        
        # Calculate total pallets needed
        total_pallets = 0
        for row in final_rows:
            if row['unitsToMake'] is None:
                continue
            product_id = int(row['product']['id'])
            ext = extended_data.get(product_id)
            
            pallet_calc = calculate_pallets_needed(
                total_units=row['unitsToMake'],
                case_length=float(ext.case_length) if ext and ext.case_length else DEFAULT_CASE_LENGTH,
                case_width=float(ext.case_width) if ext and ext.case_width else DEFAULT_CASE_WIDTH,
                case_height=float(ext.case_height) if ext and ext.case_height else DEFAULT_CASE_HEIGHT,
                case_weight=float(ext.case_weight) if ext and ext.case_weight else DEFAULT_CASE_WEIGHT,
                units_per_case=ext.units_per_case if ext and ext.units_per_case else DEFAULT_UNITS_PER_CASE,
                program='FBA'
            )
            total_pallets += pallet_calc['pallets_decimal']
        
        calculation_time = time.time() - start_time
        
        return Response({
            'rows': final_rows,
            'summary': {
                'totalProducts': len(final_rows),
                'totalUnitsToMake': total_units_to_make,
                'avgDaysOfInventory': round(avg_doi),
                'totalDaysOfInventory': total_doi,
                'productsAtRisk': products_at_risk,
                'doiThreshold': doi_threshold,
                'totalPallets': round(total_pallets, 1),
            },
            'settings': settings,
            'calculationTime': round(calculation_time, 3),
        })
    
    @action(detail=False, methods=['get'], url_path='product/(?P<product_id>[^/.]+)')
    def product_forecast(self, request, product_id=None):
        """
        Get detailed forecast for a single product.
        Returns data from all three algorithms.
        """
        try:
            product = Product.objects.get(id=product_id, user=request.user)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get user's DOI settings
        doi_settings = DOISettings.objects.filter(
            user=request.user, 
            is_default=True
        ).first()
        
        settings = {
            'amazon_doi_goal': doi_settings.amazon_doi_goal if doi_settings else 93,
            'inbound_lead_time': doi_settings.inbound_lead_time if doi_settings else 30,
            'manufacture_lead_time': doi_settings.manufacture_lead_time if doi_settings else 7,
            'market_adjustment': doi_settings.market_adjustment if doi_settings else 0.05,
            'velocity_weight': doi_settings.velocity_weight if doi_settings else 0.15,
        }
        
        service = ForecastService(settings)
        
        try:
            # ForecastService.get_inventory_data will get from CurrentInventory
            result = service.generate_forecast(product_id=product.id)
            return Response(result)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """
        Generate and cache forecasts for multiple products.
        
        Request body:
        - product_ids: List of product IDs (optional, defaults to all)
        - algorithm: Algorithm to use (optional, auto-detects)
        """
        product_ids = request.data.get('product_ids', [])
        algorithm = request.data.get('algorithm')
        
        if product_ids:
            products = Product.objects.filter(
                id__in=product_ids, 
                user=request.user
            )
        else:
            products = Product.objects.filter(
                user=request.user,
                is_active=True,
                weekly_sales__isnull=False
            ).distinct()
        
        service = ForecastService()
        results = []
        errors = []
        
        for product in products:
            try:
                result = service.generate_forecast(
                    product_id=product.id,
                    algorithm=algorithm
                )
                # Cache the result
                service.cache_forecast(product, result)
                results.append({
                    'product_id': product.id,
                    'asin': product.asin,
                    'success': True
                })
            except Exception as e:
                errors.append({
                    'product_id': product.id,
                    'asin': product.asin,
                    'error': str(e)
                })
        
        return Response({
            'generated': len(results),
            'errors': len(errors),
            'results': results,
            'error_details': errors
        })
