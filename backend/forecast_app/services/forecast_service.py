"""
Forecast Service - High-level API for generating product forecasts

This service provides an easy-to-use interface for generating forecasts
using the underlying algorithms and database models.
"""

from datetime import date
from typing import Dict, List, Optional
from django.db.models import Sum

from forecast_app.models import Product, ForecastCache
from analytics_app.models import WeeklySales, VineClaim, ProductSeasonality
from inventory_app.models import CurrentInventory
from .algorithms import (
    generate_full_forecast,
    calculate_forecast_0_6m,
    calculate_forecast_6_18m,
    calculate_forecast_18m_plus,
    DEFAULT_SETTINGS,
)


class ForecastService:
    """
    High-level service for generating product forecasts.
    
    Usage:
        service = ForecastService()
        result = service.generate_forecast(product_id)
        result = service.generate_forecast_for_asin('B0123456789')
    """
    
    def __init__(self, settings: Dict = None):
        """
        Initialize the forecast service.
        
        Args:
            settings: Optional override for default forecast settings
        """
        self.settings = settings or DEFAULT_SETTINGS.copy()
    
    def get_weekly_sales_data(self, product: Product) -> List[Dict]:
        """
        Get weekly sales data for a product, formatted for the algorithms.
        """
        sales = WeeklySales.objects.filter(product=product).order_by('week_ending')
        return [
            {
                'week_end': s.week_ending,
                'units_sold': s.units_sold,
                'revenue': float(s.revenue) if s.revenue else 0,
                'orders': s.orders
            }
            for s in sales
        ]
    
    def get_vine_claims_data(self, product: Product) -> List[Dict]:
        """
        Get vine claims data for a product.
        """
        vines = VineClaim.objects.filter(product=product)
        return [
            {
                'claim_date': v.claim_date,
                'units_claimed': v.units_claimed
            }
            for v in vines
        ]
    
    def get_seasonality_data(self, product: Product) -> List[Dict]:
        """
        Get seasonality data for a product.
        Returns 52 weeks of seasonality data if available.
        """
        seasonality = ProductSeasonality.objects.filter(product=product).order_by('week_of_year')
        return [
            {
                'week_of_year': s.week_of_year,
                'search_volume': s.search_volume,
                'sv_smooth_env': s.sv_smooth_env,
                'seasonality_index': s.seasonality_index,
                'seasonality_multiplier': s.seasonality_multiplier
            }
            for s in seasonality
        ]
    
    def get_inventory_data(self, product: Product) -> Dict:
        """
        Get current inventory data for a product.
        
        Total inventory calculation (matching TPSv2 Excel):
        - FBA: available + reserved + inbound + unfulfillable
        - AWD: available + reserved + inbound + outbound_to_fba
        
        This gives the complete picture of inventory that will eventually be
        available for fulfilling orders.
        """
        try:
            inv = CurrentInventory.objects.get(product=product)
            
            # FBA total: all inventory currently at/heading to FBA
            fba_total = (
                inv.fba_available +
                inv.fba_reserved +
                inv.fba_inbound +
                inv.fba_unfulfillable
            )
            
            # AWD total: all inventory at/heading to AWD (including outbound to FBA)
            awd_total = (
                inv.awd_available +
                inv.awd_reserved +
                inv.awd_inbound +
                inv.awd_outbound_to_fba
            )
            
            return {
                # Total for forecast calculations (all channels)
                'total_inventory': fba_total + awd_total,
                
                # FBA breakdown
                'fba_available': inv.fba_available,
                'fba_reserved': inv.fba_reserved,
                'fba_inbound': inv.fba_inbound,
                'fba_unfulfillable': inv.fba_unfulfillable,
                'fba_total': fba_total,
                
                # FBA reserved breakdown
                'fba_reserved_customer_order': inv.fba_reserved_customer_order,
                'fba_reserved_fc_transfer': inv.fba_reserved_fc_transfer,
                'fba_reserved_fc_processing': inv.fba_reserved_fc_processing,
                
                # AWD breakdown  
                'awd_available': inv.awd_available,
                'awd_reserved': inv.awd_reserved,
                'awd_inbound': inv.awd_inbound,
                'awd_outbound_to_fba': inv.awd_outbound_to_fba,
                'awd_total': awd_total,
                
                # Inventory age
                'age_0_to_90': inv.age_0_to_90,
                'age_91_to_180': inv.age_91_to_180,
                'age_181_to_270': inv.age_181_to_270,
                'age_271_to_365': inv.age_271_to_365,
                'age_365_plus': inv.age_365_plus,
                
                # Amazon's DOI calculation
                'days_of_supply_amazon': inv.days_of_supply,
            }
        except CurrentInventory.DoesNotExist:
            return {
                'total_inventory': 0,
                'fba_available': 0,
                'fba_reserved': 0,
                'fba_inbound': 0,
                'fba_unfulfillable': 0,
                'fba_total': 0,
                'fba_reserved_customer_order': 0,
                'fba_reserved_fc_transfer': 0,
                'fba_reserved_fc_processing': 0,
                'awd_available': 0,
                'awd_reserved': 0,
                'awd_inbound': 0,
                'awd_outbound_to_fba': 0,
                'awd_total': 0,
                'age_0_to_90': 0,
                'age_91_to_180': 0,
                'age_181_to_270': 0,
                'age_271_to_365': 0,
                'age_365_plus': 0,
                'days_of_supply_amazon': 0,
            }
    
    def determine_algorithm(self, product: Product) -> str:
        """
        Determine which algorithm to use based on product launch date.
        
        - 0-6m: Product launched less than 6 months ago
        - 6-18m: Product launched 6-18 months ago
        - 18m+: Product launched more than 18 months ago
        """
        if not product.launch_date:
            # No launch date, check sales history
            first_sale = WeeklySales.objects.filter(product=product).order_by('week_ending').first()
            if first_sale:
                launch_date = first_sale.week_ending
            else:
                return '18m+'  # Default to most mature algorithm
        else:
            launch_date = product.launch_date
        
        today = date.today()
        months_since_launch = (today.year - launch_date.year) * 12 + (today.month - launch_date.month)
        
        if months_since_launch < 6:
            return '0-6m'
        elif months_since_launch < 18:
            return '6-18m'
        else:
            return '18m+'
    
    def generate_forecast(
        self,
        product_id: int,
        algorithm: str = None,
        custom_settings: Dict = None,
        custom_inventory: Dict = None,
        calculation_date: date = None
    ) -> Dict:
        """
        Generate a full forecast for a product.
        
        Args:
            product_id: Product ID
            algorithm: Override algorithm selection ('0-6m', '6-18m', '18m+')
            custom_settings: Override forecast settings
            custom_inventory: Override inventory data
            calculation_date: Date to use as "today" (defaults to current date)
        
        Returns:
            Complete forecast results from all three algorithms
        """
        product = Product.objects.get(id=product_id)
        return self._generate_forecast_for_product(
            product, algorithm, custom_settings, custom_inventory, calculation_date
        )
    
    def generate_forecast_for_asin(
        self,
        asin: str,
        user_id: int = None,
        algorithm: str = None,
        custom_settings: Dict = None,
        custom_inventory: Dict = None,
        calculation_date: date = None
    ) -> Dict:
        """
        Generate a full forecast for a product by ASIN.
        
        Args:
            asin: Product ASIN
            user_id: Optional user ID to filter products
            algorithm: Override algorithm selection
            custom_settings: Override forecast settings
            custom_inventory: Override inventory data
            calculation_date: Date to use as "today"
        
        Returns:
            Complete forecast results from all three algorithms
        """
        queryset = Product.objects.filter(asin=asin)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        product = queryset.first()
        if not product:
            raise ValueError(f"Product with ASIN {asin} not found")
        
        return self._generate_forecast_for_product(
            product, algorithm, custom_settings, custom_inventory, calculation_date
        )
    
    def _generate_forecast_for_product(
        self,
        product: Product,
        algorithm: str = None,
        custom_settings: Dict = None,
        custom_inventory: Dict = None,
        calculation_date: date = None
    ) -> Dict:
        """
        Internal method to generate forecast for a product instance.
        """
        # Get data
        units_data = self.get_weekly_sales_data(product)
        vine_claims = self.get_vine_claims_data(product)
        seasonality_data = self.get_seasonality_data(product)
        inventory = custom_inventory or self.get_inventory_data(product)
        
        # Determine algorithm if not specified
        if algorithm is None:
            algorithm = self.determine_algorithm(product)
        
        # Merge settings
        settings = {**self.settings}
        if custom_settings:
            settings.update(custom_settings)
        
        # Generate forecast
        result = generate_full_forecast(
            product_asin=product.asin,
            units_sold_data=units_data,
            seasonality_data=seasonality_data,
            inventory=inventory,
            settings=settings,
            today=calculation_date,
            algorithm=algorithm,
            vine_claims=vine_claims
        )
        
        # Add product info
        result['product'] = {
            'id': product.id,
            'asin': product.asin,
            'name': product.name,
            'sku': product.sku,
            'size': product.size,
            'brand': product.brand.name if product.brand else None,
            'launch_date': product.launch_date.isoformat() if product.launch_date else None,
            'status': product.status,
            'image_url': product.image_url if product.image_url else None,
        }
        
        # Add historical sales data for chart visualization
        result['sales_history'] = [
            {
                'week_end': s['week_end'].isoformat() if hasattr(s['week_end'], 'isoformat') else str(s['week_end']),
                'units_sold': s['units_sold'],
                'revenue': s.get('revenue', 0),
            }
            for s in units_data[-52:]  # Last 52 weeks
        ]
        
        # Add data availability info
        result['data_availability'] = {
            'weeks_of_sales_data': len(units_data),
            'has_seasonality': len(seasonality_data) > 0,
            'seasonality_weeks': len(seasonality_data),
            'vine_claims_count': len(vine_claims),
            'has_inventory': inventory.get('total_inventory', 0) > 0
        }
        
        return result
    
    def generate_forecasts_batch(
        self,
        product_ids: List[int],
        algorithm: str = None,
        custom_settings: Dict = None
    ) -> List[Dict]:
        """
        Generate forecasts for multiple products.
        
        Args:
            product_ids: List of product IDs
            algorithm: Override algorithm selection (applies to all)
            custom_settings: Override forecast settings (applies to all)
        
        Returns:
            List of forecast results
        """
        results = []
        for product_id in product_ids:
            try:
                result = self.generate_forecast(
                    product_id=product_id,
                    algorithm=algorithm,
                    custom_settings=custom_settings
                )
                results.append(result)
            except Exception as e:
                results.append({
                    'product_id': product_id,
                    'error': str(e)
                })
        
        return results
    
    def cache_forecast(self, product: Product, forecast_result: Dict) -> ForecastCache:
        """
        Cache forecast results for quick retrieval.
        """
        today = date.today()
        primary_algo = forecast_result.get('active_algorithm', '18m+')
        algo_result = forecast_result.get('algorithms', {}).get(primary_algo, {})
        
        # Determine status based on DOI
        doi_total = algo_result.get('doi_total_days', 0)
        if doi_total <= 30:
            status = 'critical'
        elif doi_total <= 60:
            status = 'low'
        elif doi_total <= 150:
            status = 'good'
        else:
            status = 'overstock'
        
        cache, _ = ForecastCache.objects.update_or_create(
            product=product,
            algorithm_version=primary_algo,
            forecast_date=today,
            defaults={
                'units_to_make': algo_result.get('units_to_make', 0),
                'current_doi': doi_total,
                'runout_date': algo_result.get('runout_date_total'),
                'cumulative_data': forecast_result,
                'status': status
            }
        )
        
        return cache


def get_forecast_service(settings: Dict = None) -> ForecastService:
    """
    Factory function to get a ForecastService instance.
    """
    return ForecastService(settings)
