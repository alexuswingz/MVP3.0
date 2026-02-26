from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.core.cache import cache
from django.db.models import Count, Q, Sum, Prefetch
from django.db import connection
from datetime import date
import time
import math

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
        - limit: Max number of products to return (default 100)
        """
        start_time = time.time()
        
        # Get filter params
        search = request.query_params.get('search', '').strip()
        brand_id = request.query_params.get('brand')
        product_status = request.query_params.get('status')
        sort_by = request.query_params.get('sort_by', 'doi')
        sort_order = request.query_params.get('sort_order', 'asc')
        limit = int(request.query_params.get('limit', 100))
        
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
        from django.db.models import Max, Min, Avg, Count as DjCount
        
        products_with_sales = Product.objects.filter(
            user=request.user,
            is_active=True,
            weekly_sales__isnull=False
        ).select_related('brand').annotate(
            weeks_of_data=DjCount('weekly_sales'),
            latest_week=Max('weekly_sales__week_ending'),
            first_sale_week=Min('weekly_sales__week_ending'),
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
        
        # Limit the query
        products_with_sales = products_with_sales[:limit]
        
        # Prefetch weekly sales data for all products
        product_ids = [p.id for p in products_with_sales]
        weekly_sales_data = {}
        for sale in WeeklySales.objects.filter(product_id__in=product_ids).order_by('product_id', 'week_ending'):
            if sale.product_id not in weekly_sales_data:
                weekly_sales_data[sale.product_id] = []
            weekly_sales_data[sale.product_id].append({
                'week_end': sale.week_ending,
                'units_sold': sale.units_sold,
            })
        
        # Build forecast rows using the actual algorithms
        forecast_rows = []
        today = date.today()
        
        from datetime import timedelta
        
        for product in products_with_sales:
            # Get inventory data
            inv = current_inventory.get(product.id, {})
            total_inventory = inv.get('total_inventory', 0)
            fba_available = inv.get('fba_available', 0)
            fba_total = inv.get('fba_total', 0)
            awd_available = inv.get('awd_available', 0)
            awd_total = inv.get('awd_total', 0)
            
            # Determine algorithm based on product age (launch date or first sale)
            launch_date = product.launch_date or product.first_sale_week
            if launch_date:
                months_since_launch = (today.year - launch_date.year) * 12 + (today.month - launch_date.month)
                if months_since_launch < 6:
                    algorithm = '0-6m'
                elif months_since_launch < 18:
                    algorithm = '6-18m'
                else:
                    algorithm = '18m+'
            else:
                algorithm = '18m+'  # Default to most mature algorithm
            
            # Get product's weekly sales data
            units_data = weekly_sales_data.get(product.id, [])
            avg_weekly = product.avg_weekly_sales or 0
            
            # Prepare settings for algorithm
            algo_settings = {
                **settings,
                'total_inventory': total_inventory,
                'fba_available': fba_available,
            }
            
            # Check if we have enough historical data for 18m+ algorithm
            # 18m+ requires 52+ weeks of data to use prior year pattern matching
            has_prior_year_data = len(units_data) >= 52
            
            # Use full 18m+ algorithm only if we have prior year data
            if has_prior_year_data and algorithm == '18m+':
                try:
                    forecast_result = calculate_forecast_18m_plus(
                        units_data, today, algo_settings
                    )
                    units_to_make = forecast_result['units_to_make']
                    doi_total = forecast_result['doi_total_days']
                    doi_fba = forecast_result['doi_fba_days']
                    total_units_needed = forecast_result['total_units_needed']
                    runout_date = forecast_result.get('runout_date_total')
                    if runout_date:
                        runout_date = runout_date.isoformat() if hasattr(runout_date, 'isoformat') else str(runout_date)
                except Exception:
                    # Fallback to velocity-based calculation
                    has_prior_year_data = False
            
            # For products without prior year data, use velocity-based forecast
            # This applies the market adjustment to average sales velocity
            if not has_prior_year_data:
                # Apply market adjustment to average weekly sales
                market_adj = settings.get('market_adjustment', 0.05)
                velocity_adj = settings.get('velocity_weight', 0.15) * 0.10  # velocity_weight * sales_velocity_adjustment
                adjusted_weekly = avg_weekly * (1 + market_adj + velocity_adj)
                
                if adjusted_weekly > 0:
                    # DOI = inventory / daily sales rate
                    daily_sales = adjusted_weekly / 7
                    doi_total = int(total_inventory / daily_sales) if daily_sales > 0 else 365
                    doi_fba = int(fba_total / daily_sales) if daily_sales > 0 and fba_total > 0 else 0
                    
                    # Units needed during lead time
                    lead_time_weeks = doi_threshold / 7
                    total_units_needed = int(adjusted_weekly * lead_time_weeks)
                    units_to_make = max(0, total_units_needed - total_inventory)
                    
                    # Runout date
                    days_until_runout = total_inventory / daily_sales if daily_sales > 0 else 365
                    runout_date = (today + timedelta(days=days_until_runout)).isoformat()
                else:
                    # No sales data - use defaults
                    doi_total = 365
                    doi_fba = 365
                    total_units_needed = 0
                    units_to_make = 0
                    runout_date = None
            
            forecast_rows.append({
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
                    'launchDate': launch_date.isoformat() if launch_date else None,
                },
                # Inventory breakdown
                'inventory': {
                    'total': total_inventory,
                    'fbaAvailable': fba_available,
                    'fbaTotal': fba_total,
                    'awdAvailable': awd_available,
                    'awdTotal': awd_total,
                },
                # Forecast results from algorithm
                'unitsToMake': units_to_make,
                'daysOfInventory': doi_total,
                'doiFba': doi_fba,
                'runoutDate': runout_date,
                'totalUnitsNeeded': total_units_needed,
                'weeksOfData': product.weeks_of_data or 0,
                'avgWeeklySales': round(avg_weekly, 1) if avg_weekly else 0,
                'algorithm': algorithm,
            })
        
        # Sort results
        if sort_by == 'doi':
            forecast_rows.sort(key=lambda x: x['daysOfInventory'], reverse=(sort_order == 'desc'))
        elif sort_by == 'units_to_make':
            forecast_rows.sort(key=lambda x: x['unitsToMake'], reverse=(sort_order == 'desc'))
        elif sort_by == 'inventory':
            forecast_rows.sort(key=lambda x: x['inventory']['total'], reverse=(sort_order == 'desc'))
        elif sort_by == 'name':
            forecast_rows.sort(key=lambda x: x['product']['name'].lower(), reverse=(sort_order == 'desc'))
        
        # Calculate summary stats
        total_units_to_make = sum(r['unitsToMake'] for r in forecast_rows)
        avg_doi = sum(r['daysOfInventory'] for r in forecast_rows) / len(forecast_rows) if forecast_rows else 0
        products_at_risk = sum(1 for r in forecast_rows if r['daysOfInventory'] < doi_threshold)
        
        # Calculate total DOI (inventory-weighted average)
        total_inventory_all = sum(r['inventory']['total'] for r in forecast_rows)
        if total_inventory_all > 0:
            # Weight DOI by inventory amount
            weighted_doi = sum(r['daysOfInventory'] * r['inventory']['total'] for r in forecast_rows) / total_inventory_all
            total_doi = round(weighted_doi)
        else:
            total_doi = round(avg_doi)
        
        # Get case dimensions for products (for pallet calculation)
        product_ids = [int(r['product']['id']) for r in forecast_rows]
        extended_data = {
            pe.product_id: pe 
            for pe in ProductExtended.objects.filter(product_id__in=product_ids)
        }
        
        # Calculate total pallets needed across all products
        total_pallets = 0
        for row in forecast_rows:
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
            'rows': forecast_rows,
            'summary': {
                'totalProducts': len(forecast_rows),
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
