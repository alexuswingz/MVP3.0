# Implementation Guide

## Project Structure

Create the monorepo structure with the following layout:

```
mvp3-django/
├── apps/
│   ├── authentication/           # User management & auth
│   ├── forecast/                # Forecast algorithms & logic
│   ├── analytics/               # Analytics & reporting
│   ├── inventory/               # Inventory management
│   ├── api/                     # REST API & GraphQL
│   └── common/                  # Shared utilities & models
├── config/
│   ├── settings/
│   │   ├── base.py             # Base settings
│   │   ├── development.py      # Development settings
│   │   ├── production.py       # Production settings
│   │   └── testing.py          # Test settings
│   ├── urls.py                 # Main URL configuration
│   ├── wsgi.py                 # WSGI configuration
│   └── celery.py               # Celery configuration
├── services/
│   ├── amazon_spapi.py         # Amazon SP-API integration
│   ├── shopify.py              # Shopify integration
│   ├── cache.py                # Advanced caching
│   └── metrics.py              # Metrics collection
├── database/
│   ├── migrations/             # Django migrations
│   ├── models/                 # SQL scripts for complex operations
│   └── views/                  # Materialized views
├── tests/
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   ├── load/                   # Load tests (Locust)
│   └── fixtures/               # Test data
├── docs/
│   ├── api/                    # API documentation
│   ├── deployment/             # Deployment guides
│   └── architecture/           # Architecture docs
├── scripts/
│   ├── migrate_data.py         # Data migration from legacy systems
│   ├── setup.sh                # Initial setup script
│   └── deploy.sh               # Deployment script
├── infrastructure/
│   ├── docker/                 # Docker configurations
│   ├── terraform/              # Infrastructure as code
│   └── kubernetes/             # K8s manifests
├── requirements/
│   ├── base.txt                # Base dependencies
│   ├── development.txt         # Development dependencies
│   └── production.txt          # Production dependencies
├── static/                     # Static files
├── templates/                  # Django templates
├── media/                      # User uploaded files
├── logs/                       # Application logs
├── .env.example                # Environment variables template
├── manage.py                   # Django management script
├── Dockerfile                  # Container definition
└── docker-compose.yml          # Docker Compose configuration
```

## Step-by-Step Implementation

### Phase 1: Foundation (Week 1-2)

#### 1.1 Initialize Django Project

```bash
# Create project structure
django-admin startproject mvp3_django .

# Create Django apps
python manage.py startapp authentication
python manage.py startapp forecast
python manage.py startapp analytics
python manage.py startapp inventory
python manage.py startapp api
python manage.py startapp common

# Install dependencies
pip install -r requirements/development.txt
```

#### 1.2 Configure Settings

```python
# config/settings/base.py
import os
from pathlib import Path

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Core Django settings
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
DEBUG = False
ALLOWED_HOSTS = []

# Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'corsheaders',
    'django_extensions',
    'django_filters',
    'graphene_django',
    'django_celery_beat',
    'django_celery_results',
]

LOCAL_APPS = [
    'apps.authentication',
    'apps.forecast',
    'apps.analytics',
    'apps.inventory',
    'apps.api',
    'apps.common',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'mvp3'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'ATOMIC_REQUESTS': True,
        'CONN_MAX_AGE': 600,
    }
}

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.CursorPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%SZ',
    'DATE_FORMAT': '%Y-%m-%d',
}

# Celery
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'django.log'),
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}
```

#### 1.3 Create Common Models

```python
# apps/common/models.py
import uuid
from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base class that provides self-updating created and modified fields"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        abstract = True
        ordering = ['-created_at']


class BaseModel(TimeStampedModel):
    """Base model with common fields for all models"""
    created_by = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, related_name='%(class)s_created')
    updated_by = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, related_name='%(class)s_updated')
    
    # Audit fields
    version = models.IntegerField(default=1)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        abstract = True


class SingletonModel(models.Model):
    """Base model for singleton objects like settings"""
    class Meta:
        abstract = True
    
    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        pass
    
    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
```

### Phase 2: Authentication System (Week 2-3)

#### 2.1 Create User Model

```python
# apps/authentication/models.py
from django.contrib.auth.models import AbstractUser
from apps.common.models import BaseModel


class User(AbstractUser, BaseModel):
    """Enhanced user model with Amazon seller integration"""
    
    # Amazon seller information
    amazon_seller_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    marketplace_id = models.CharField(max_length=50, null=True, blank=True)
    
    # Subscription and billing
    SUBSCRIPTION_TIERS = [
        ('free', 'Free'),
        ('basic', 'Basic'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]
    subscription_tier = models.CharField(max_length=20, choices=SUBSCRIPTION_TIERS, default='free')
    subscription_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Preferences
    timezone = models.CharField(max_length=50, default='UTC')
    language = models.CharField(max_length=10, default='en')
    
    # Security
    login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    
    # Email preferences
    email_verified = models.BooleanField(default=False)
    notification_preferences = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['amazon_seller_id']),
            models.Index(fields=['subscription_tier']),
            models.Index(fields=['email_verified']),
        ]


class UserProfile(BaseModel):
    """Extended user profile information"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Company information
    company_name = models.CharField(max_length=200, null=True, blank=True)
    company_website = models.URLField(null=True, blank=True)
    business_type = models.CharField(max_length=50, null=True, blank=True)
    
    # Contact information
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    address_line_1 = models.CharField(max_length=255, null=True, blank=True)
    address_line_2 = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    postal_code = models.CharField(max_length=20, null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    
    # Forecast settings
    default_doi_goal = models.IntegerField(default=93)
    default_inbound_lead_time = models.IntegerField(default=30)
    default_manufacture_lead_time = models.IntegerField(default=7)
    default_market_adjustment = models.FloatField(default=0.05)
    default_velocity_weight = models.FloatField(default=0.15)
    
    # Notifications
    email_notifications_enabled = models.BooleanField(default=True)
    sms_notifications_enabled = models.BooleanField(default=False)
    webhook_url = models.URLField(null=True, blank=True)
    
    class Meta:
        db_table = 'user_profiles'
```

#### 2.2 Authentication Views

```python
# apps/authentication/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from ..common.models import BaseModel


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Custom login with Amazon OAuth integration"""
    
    # Validate input
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # Authenticate user
    user = authenticate(
        request,
        username=serializer.validated_data['username'],
        password=serializer.validated_data['password']
    )
    
    if user is None:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Check if account is locked
    if user.locked_until and user.locked_until > timezone.now():
        return Response(
            {'error': 'Account is locked'},
            status=status.HTTP_423_LOCKED
        )
    
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    
    # Update last login
    user.last_login = timezone.now()
    user.login_attempts = 0
    user.save()
    
    return Response({
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': UserSerializer(user).data
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def amazon_oauth_view(request):
    """Handle Amazon OAuth callback"""
    
    # Get Amazon authorization code
    auth_code = request.data.get('code')
    if not auth_code:
        return Response(
            {'error': 'Authorization code required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Exchange code for access token
    token_data = exchange_auth_code_for_token(auth_code)
    
    # Get user info from Amazon
    user_info = get_amazon_user_info(token_data['access_token'])
    
    # Create or update user
    user, created = User.objects.get_or_create(
        amazon_seller_id=user_info['seller_id'],
        defaults={
            'username': user_info['email'],
            'email': user_info['email'],
            'first_name': user_info.get('first_name', ''),
            'last_name': user_info.get('last_name', ''),
            'marketplace_id': user_info.get('marketplace_id', ''),
        }
    )
    
    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': UserSerializer(user).data,
        'created': created
    })
```

### Phase 3: Forecast System (Week 3-4)

#### 3.1 Product Model

```python
# apps/forecast/models.py
from django.db import models
from apps.common.models import BaseModel


class Category(BaseModel):
    """Product category system"""
    name = models.CharField(max_length=100, unique=True)
    parent = models.ForeignKey('self', null=True, on_delete=models.CASCADE)
    amazon_category_id = models.CharField(max_length=50, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    
    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']


class Product(BaseModel):
    """Product information with integration to both legacy systems"""
    
    # Product identifiers
    asin = models.CharField(max_length=10, unique=True)
    parent_asin = models.CharField(max_length=10, null=True, blank=True)
    sku = models.CharField(max_length=50, null=True, blank=True)
    
    # Product details
    name = models.CharField(max_length=500)
    brand = models.CharField(max_length=100, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    
    # Dates
    release_date = models.DateField()
    discontinued_date = models.DateField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_discontinued = models.BooleanField(default=False)
    
    # Dimensions (for shipping calculations)
    length_cm = models.FloatField(null=True, blank=True)
    width_cm = models.FloatField(null=True, blank=True)
    height_cm = models.FloatField(null=True, blank=True)
    weight_kg = models.FloatField(null=True, blank=True)
    
    class Meta:
        db_table = 'products'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['asin']),
            models.Index(fields=['parent_asin']),
            models.Index(fields=['category']),
            models.Index(fields=['is_active']),
            models.Index(fields=['release_date']),
        ]
    
    def get_product_age_months(self):
        """Calculate product age in months for algorithm selection"""
        today = date.today()
        delta = today - self.release_date
        return delta.days / 30.44  # Average days per month
    
    def select_forecast_algorithm(self):
        """Select appropriate forecast algorithm based on product age"""
        age_months = self.get_product_age_months()
        
        if age_months <= 6:
            return 'new_product'
        elif age_months <= 18:
            return 'growing_product'
        else:
            return 'mature_product'
```

#### 3.2 Forecast Algorithm Implementation

```python
# apps/forecast/algorithms/base.py
from abc import ABC, abstractmethod
from datetime import date, timedelta
from typing import Dict, Any
import numpy as np
from dataclasses import dataclass


@dataclass
class ForecastResult:
    """Result structure for forecast calculations"""
    units_to_make: int
    current_doi: float
    runout_date: date
    status: str
    cumulative_data: Dict[int, int]  # days: units
    calculation_time: float
    algorithm: str
    confidence_score: float
    notes: str = ""


class BaseForecastAlgorithm(ABC):
    """Base class for all forecasting algorithms"""
    
    def __init__(self, product, settings, historical_data):
        self.product = product
        self.settings = settings
        self.historical_data = historical_data
    
    @abstractmethod
    def calculate(self) -> ForecastResult:
        """Calculate forecast for the product"""
        pass
    
    @abstractmethod
    def get_algorithm_name(self) -> str:
        """Return algorithm name for tracking"""
        pass
    
    def get_seasonality_adjustment(self, forecast_date: date) -> float:
        """Calculate seasonality adjustment for given date"""
        seasonality_data = self.historical_data.get('seasonality', {})
        week_of_year = forecast_date.isocalendar()[1]
        
        return seasonality_data.get(week_of_year, 1.0)
    
    def calculate_doi(self, inventory_level: int, weekly_velocity: float) -> float:
        """Calculate days of inventory"""
        if weekly_velocity <= 0:
            return float('inf')
        
        daily_velocity = weekly_velocity / 7
        return inventory_level / daily_velocity


# apps/forecast/algorithms/new_product.py
class NewProductAlgorithm(BaseForecastAlgorithm):
    """Algorithm for products 0-6 months old - Uses peak-based forecasting"""
    
    def get_algorithm_name(self) -> str:
        return "new_product_v2.2"
    
    def calculate(self) -> ForecastResult:
        start_time = time.time()
        
        # Get historical sales data
        sales_data = self.historical_data['sales']
        inventory_data = self.historical_data['inventory']
        
        # Find peak week (excluding Vine units)
        peak_week = self._find_peak_week(sales_data)
        
        # Calculate seasonality adjustment
        today = date.today()
        seasonality_today = self.get_seasonality_adjustment(today)
        
        # Calculate forecast for planning horizon (default 130 days)
        planning_horizon = self.settings.get('planning_horizon', 130)
        forecast_end_date = today + timedelta(days=planning_horizon)
        seasonality_future = self.get_seasonality_adjustment(forecast_end_date)
        
        # Apply seasonality elasticity (0.65)
        seasonality_elasticity = self.settings.get('seasonality_elasticity', 0.65)
        seasonality_factor = (seasonality_future / seasonality_today) ** seasonality_elasticity
        
        # Calculate base forecast
        base_forecast = peak_week * seasonality_factor
        
        # Calculate cumulative data
        cumulative_data = self._calculate_cumulative_forecast(
            base_forecast, seasonality_today, seasonality_elasticity
        )
        
        # Calculate units to make
        current_inventory = inventory_data.get('available', 0)
        doi_goal = self.settings.get('doi_goal', 130)
        
        units_to_make = max(0, int(base_forecast * (doi_goal / 7) - current_inventory))
        
        # Calculate metrics
        weekly_velocity = base_forecast
        current_doi = self.calculate_doi(current_inventory, weekly_velocity)
        
        # Determine status
        status = self._determine_status(current_doi)
        
        calculation_time = time.time() - start_time
        
        return ForecastResult(
            units_to_make=units_to_make,
            current_doi=current_doi,
            runout_date=today + timedelta(days=int(current_doi)),
            status=status,
            cumulative_data=cumulative_data,
            calculation_time=calculation_time,
            algorithm=self.get_algorithm_name(),
            confidence_score=self._calculate_confidence(sales_data)
        )
    
    def _find_peak_week(self, sales_data):
        """Find peak week sales, excluding Amazon Vine units"""
        # Implementation from forecast_0_6m.py
        vine_weeks = self.historical_data.get('vine_claims', {})
        
        max_sales = 0
        for week_data in sales_data:
            week_end = week_data['week_end']
            units_sold = week_data['units_sold']
            
            # Subtract Vine units if any
            vine_units = vine_weeks.get(week_end, 0)
            adjusted_units = max(0, units_sold - vine_units)
            
            max_sales = max(max_sales, adjusted_units)
        
        return max_sales
    
    def _calculate_cumulative_forecast(self, base_forecast, seasonality_today, elasticity):
        """Calculate cumulative forecast data for fast DOI recalculation"""
        cumulative = {}
        today = date.today()
        
        for days in [30, 60, 90, 120, 150, 180, 365]:
            future_date = today + timedelta(days=days)
            seasonality_future = self.get_seasonality_adjustment(future_date)
            seasonality_factor = (seasonality_future / seasonality_today) ** elasticity
            cumulative[days] = int(base_forecast * (days / 7) * seasonality_factor)
        
        return cumulative
    
    def _determine_status(self, doi):
        """Determine product status based on DOI"""
        if doi <= 14:
            return 'critical'
        elif doi <= 30:
            return 'low'
        else:
            return 'good'
    
    def _calculate_confidence(self, sales_data):
        """Calculate confidence score based on data quality"""
        # Simple confidence calculation based on data recency and volume
        if len(sales_data) < 4:  # Less than 4 weeks of data
            return 0.6
        elif len(sales_data) < 8:  # Less than 8 weeks of data
            return 0.8
        else:
            return 0.95
```

### Phase 4: API Development (Week 4-5)

#### 4.1 Create Unified Forecast API

```python
# apps/api/views/forecast.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from .serializers import ForecastSerializer, ForecastCacheSerializer
from apps.forecast.models import Product, ForecastCache
from apps.forecast.services import ForecastService


class ForecastViewSet(viewsets.ReadOnlyModelViewSet):
    """Unified forecast API combining both legacy systems"""
    
    serializer_class = ForecastSerializer
    queryset = Product.objects.filter(is_active=True)
    lookup_field = 'asin'
    
    def get_object(self):
        """Get product by ASIN"""
        asin = self.kwargs['asin']
        return get_object_or_404(Product, asin=asin, is_active=True)
    
    def retrieve(self, request, *args, **kwargs):
        """Get forecast for single product"""
        product = self.get_object()
        
        # Check cache first
        cache_key = f'forecast_{product.asin}_{date.today().isoformat()}'
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        # Get DOI settings for user
        doi_settings = request.user.profile.get_doi_settings()
        
        # Calculate forecast
        service = ForecastService()
        forecast_result = service.calculate_forecast(product, doi_settings)
        
        # Serialize result
        serializer = self.get_serializer(forecast_result)
        data = serializer.data
        
        # Cache for 1 hour
        cache.set(cache_key, data, 3600)
        
        # Emit metric
        metrics.forecast_cache_hits.labels(algorithm=forecast_result.algorithm).inc()
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def bulk(self, request):
        """Get forecasts for multiple products"""
        
        # Get list of ASINs
        asins = request.query_params.getlist('asins')
        if not asins:
            # Return all active products if no ASINs specified
            products = Product.objects.filter(is_active=True)[:100]
        else:
            products = Product.objects.filter(asin__in=asins, is_active=True)
        
        # Use parallel processing for bulk forecasts
        doi_settings = request.user.profile.get_doi_settings()
        service = ForecastService()
        
        results = service.calculate_bulk_forecasts(products, doi_settings)
        
        # Serialize results
        serializer = self.get_serializer(results, many=True)
        
        return Response({
            'count': len(results),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def recalculate_doi(self, request):
        """Recalculate forecasts with new DOI settings"""
        
        # Validate input
        serializer = DOISettingsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        new_settings = serializer.validated_data
        
        # Update user settings
        request.user.profile.update_doi_settings(new_settings)
        
        # Recalculate forecasts using cached cumulative data
        service = ForecastService()
        recalculated_count = service.recalculate_with_new_doi(request.user.profile, new_settings)
        
        # Clear related caches
        cache.delete_pattern('forecast_*')
        
        return Response({
            'message': f'Recalculated {recalculated_count} forecasts',
            'new_settings': new_settings
        })
    
    @action(detail=True, methods=['get'])
    def chart(self, request, asin=None):
        """Get chart data for product forecast"""
        
        product = self.get_object()
        days = int(request.query_params.get('days', 365))
        
        service = ForecastService()
        chart_data = service.get_chart_data(product, days)
        
        return Response(chart_data)
    
    @action(detail=False, methods=['post'])
    def refresh_cache(self, request):
        """Manually refresh forecast cache"""
        
        asin = request.data.get('asin')
        
        if asin:
            # Refresh single product
            product = get_object_or_404(Product, asin=asin)
            tasks.update_forecast_cache.delay(product.id)
            message = f'Cache refresh triggered for {asin}'
        else:
            # Refresh all products
            tasks.bulk_forecast_update.delay()
            message = 'Cache refresh triggered for all products'
        
        return Response({'message': message})
    
    @action(detail=False, methods=['get'])
    def planning(self, request):
        """Get planning table with all forecasts"""
        
        # Get filter parameters
        status_filter = request.query_params.get('status')
        category = request.query_params.get('category')
        sort_by = request.query_params.get('sort', 'current_doi')
        
        # Build query
        queryset = ForecastCache.objects.filter(
            forecast_date=date.today()
        ).select_related('product')
        
        # Apply filters
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if category:
            queryset = queryset.filter(product__category__name=category)
        
        # Get DOI settings for calculations
        doi_settings = request.user.profile.get_doi_settings()
        
        # Enhance with additional calculations
        enhanced_results = []
        for cache in queryset:
            # Add additional calculated fields
            enhanced_data = {
                'product': ProductSerializer(cache.product).data,
                'forecast': ForecastCacheSerializer(cache).data,
                'enhanced_metrics': self.calculate_enhanced_metrics(cache, doi_settings)
            }
            enhanced_results.append(enhanced_data)
        
        # Sort results
        reverse = sort_by.startswith('-')
        sort_field = sort_by.lstrip('-')
        enhanced_results.sort(
            key=lambda x: x['enhanced_metrics'][sort_field],
            reverse=reverse
        )
        
        return Response({
            'count': len(enhanced_results),
            'results': enhanced_results
        })
    
    def calculate_enhanced_metrics(self, forecast_cache, doi_settings):
        """Calculate additional metrics for planning"""
        
        # Calculate velocity trends
        velocity_trend = self.calculate_velocity_trend(forecast_cache.product)
        
        # Calculate stockout risk
        stockout_risk = self.calculate_stockout_risk(forecast_cache, doi_settings)
        
        # Calculate recommendation priority
        priority_score = self.calculate_priority_score(forecast_cache, velocity_trend, stockout_risk)
        
        return {
            'velocity_trend': velocity_trend,
            'stockout_risk': stockout_risk,
            'priority_score': priority_score,
            'last_calculated': timezone.now()
        }
```

#### 4.2 Create Analytics API

```python
# apps/api/views/analytics.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Avg, Count, F
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django_filters.rest_framework import DjangoFilterBackend
from .serializers import (
    DailyMetricsSerializer,
    ProductSerializer,
    CategorySerializer,
    AdMetricSerializer
)


class AnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """Comprehensive analytics API"""
    
    serializer_class = DailyMetricsSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['product', 'date']
    
    def get_queryset(self):
        """Base queryset for analytics"""
        return DailyMetrics.objects.select_related('product')
    
    def list(self, request, *args, **kwargs):
        """Get metrics with date range filtering"""
        
        # Validate date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filter queryset
        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset.filter(
            date__range=[start_date, end_date]
        )
        
        # Apply additional filters
        asins = request.query_params.getlist('asins')
        if asins:
            queryset = queryset.filter(product__asin__in=asins)
        
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(product__category__name=category)
        
        # Optimize query
        queryset = queryset.select_related('product', 'product__category')
        
        # Paginate results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary metrics by category, brand, or date period"""
        
        group_by = request.query_params.get('group_by', 'category')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Base queryset
        queryset = self.get_queryset()
        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])
        
        # Aggregate based on group_by parameter
        if group_by == 'category':
            summary = queryset.values('product__category__name').annotate(
                total_revenue=Sum('revenue'),
                total_units=Sum('units_sold'),
                total_orders=Sum('orders'),
                avg_conversion_rate=Avg('conversion_rate'),
                avg_acos=Avg('acos'),
                product_count=Count('product', distinct=True)
            ).order_by('-total_revenue')
        
        elif group_by == 'brand':
            summary = queryset.values('product__brand').annotate(
                total_revenue=Sum('revenue'),
                total_units=Sum('units_sold'),
                total_orders=Sum('orders'),
                avg_conversion_rate=Avg('conversion_rate'),
                avg_acos=Avg('acos'),
                product_count=Count('product', distinct=True)
            ).order_by('-total_revenue')
        
        elif group_by == 'date':
            # Group by date period (daily, weekly, monthly)
            period = request.query_params.get('period', 'daily')
            
            if period == 'daily':
                trunc_func = TruncDate('date')
            elif period == 'weekly':
                trunc_func = TruncWeek('date')
            elif period == 'monthly':
                trunc_func = TruncMonth('date')
            else:
                return Response(
                    {'error': 'Invalid period. Use daily, weekly, or monthly'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            summary = queryset.annotate(
                period=trunc_func
            ).values('period').annotate(
                total_revenue=Sum('revenue'),
                total_units=Sum('units_sold'),
                total_orders=Sum('orders'),
                avg_conversion_rate=Avg('conversion_rate'),
                avg_acos=Avg('acos')
            ).order_by('period')
        
        else:
            return Response(
                {'error': 'Invalid group_by parameter'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(list(summary))
    
    @action(detail=False, methods=['get'])
    def performance(self, request):
        """Get detailed performance metrics"""
        
        # Get parameters
        asin = request.query_params.get('asin')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        compare_to = request.query_params.get('compare_to')  # previous_period, previous_year
        
        if not asin:
            return Response(
                {'error': 'ASIN is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get current period metrics
        current_metrics = self._get_performance_metrics(asin, start_date, end_date)
        
        # Get comparison metrics if requested
        comparison_metrics = None
        if compare_to:
            comparison_metrics = self._get_comparison_metrics(asin, start_date, end_date, compare_to)
        
        # Calculate trends and insights
        insights = self._calculate_insights(current_metrics, comparison_metrics)
        
        return Response({
            'asin': asin,
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'current_metrics': current_metrics,
            'comparison_metrics': comparison_metrics,
            'insights': insights
        })
    
    def _get_performance_metrics(self, asin, start_date, end_date):
        """Calculate performance metrics for a product"""
        
        # Aggregate metrics
        metrics = DailyMetrics.objects.filter(
            product__asin=asin,
            date__range=[start_date, end_date]
        ).aggregate(
            total_revenue=Sum('revenue'),
            total_units=Sum('units_sold'),
            total_orders=Sum('orders'),
            total_sessions=Sum('sessions'),
            total_page_views=Sum('page_views'),
            total_ad_spend=Sum('ad_spend'),
            total_ad_sales=Sum('ad_sales'),
            total_ad_clicks=Sum('ad_clicks'),
            total_ad_impressions=Sum('ad_impressions'),
            avg_conversion_rate=Avg('conversion_rate'),
            avg_acos=Avg('acos'),
            avg_tacos=Avg('tacos'),
            avg_roas=Avg('roas')
        )
        
        # Calculate additional metrics
        days = (date.fromisoformat(end_date) - date.fromisoformat(start_date)).days + 1
        
        return {
            'total_metrics': {
                'revenue': float(metrics['total_revenue'] or 0),
                'units_sold': metrics['total_units'] or 0,
                'orders': metrics['total_orders'] or 0,
                'sessions': metrics['total_sessions'] or 0,
                'page_views': metrics['total_page_views'] or 0,
                'ad_spend': float(metrics['total_ad_spend'] or 0),
                'ad_sales': float(metrics['total_ad_sales'] or 0),
                'ad_clicks': metrics['total_ad_clicks'] or 0,
                'ad_impressions': metrics['total_ad_impressions'] or 0,
            },
            'average_metrics': {
                'conversion_rate': float(metrics['avg_conversion_rate'] or 0),
                'acos': float(metrics['avg_acos'] or 0),
                'tacos': float(metrics['avg_tacos'] or 0),
                'roas': float(metrics['avg_roas'] or 0),
            },
            'daily_averages': {
                'revenue': float(metrics['total_revenue'] or 0) / days,
                'units_sold': (metrics['total_units'] or 0) / days,
                'orders': (metrics['total_orders'] or 0) / days,
                'sessions': (metrics['total_sessions'] or 0) / days,
            }
        }
    
    def _get_comparison_metrics(self, asin, start_date, end_date, compare_to):
        """Get metrics for comparison period"""
        
        current_start = date.fromisoformat(start_date)
        current_end = date.fromisoformat(end_date)
        period_length = (current_end - current_start).days + 1
        
        if compare_to == 'previous_period':
            comparison_start = current_start - timedelta(days=period_length)
            comparison_end = current_start - timedelta(days=1)
        elif compare_to == 'previous_year':
            comparison_start = current_start.replace(year=current_start.year - 1)
            comparison_end = current_end.replace(year=current_end.year - 1)
        else:
            return None
        
        return self._get_performance_metrics(
            asin,
            comparison_start.isoformat(),
            comparison_end.isoformat()
        )
    
    def _calculate_insights(self, current, comparison):
        """Calculate insights and recommendations"""
        
        insights = []
        
        if comparison:
            # Calculate percentage changes
            revenue_change = self.calculate_percentage_change(
                current['total_metrics']['revenue'],
                comparison['total_metrics']['revenue']
            )
            
            conversion_change = self.calculate_percentage_change(
                current['average_metrics']['conversion_rate'],
                comparison['average_metrics']['conversion_rate']
            )
            
            # Generate insights
            if revenue_change > 20:
                insights.append({
                    'type': 'positive',
                    'title': 'Revenue Growth',
                    'message': f'Revenue increased by {revenue_change:.1f}% compared to previous period',
                    'action': 'Consider increasing inventory levels to capitalize on growth'
                })
            elif revenue_change < -20:
                insights.append({
                    'type': 'negative',
                    'title': 'Revenue Decline',
                    'message': f'Revenue decreased by {abs(revenue_change):.1f}% compared to previous period',
                    'action': 'Review pricing strategy and marketing efforts'
                })
            
            if conversion_change > 15:
                insights.append({
                    'type': 'positive',
                    'title': 'Conversion Rate Improvement',
                    'message': f'Conversion rate improved by {conversion_change:.1f}%',
                    'action': 'Maintain current optimization strategies'
                })
        
        # Add forecast-based insights
        # ... additional insight calculations
        
        return insights
    
    def calculate_percentage_change(self, current, previous):
        """Calculate percentage change between two values"""
        if previous == 0:
            return 100 if current > 0 else 0
        return ((current - previous) / previous) * 100
```

### Phase 5: Data Migration (Week 5-6)

#### 5.1 Migration Script

```python
# scripts/migrate_data.py
import os
import psycopg2
import pandas as pd
from django.db import transaction
from django.core.management.base import BaseCommand
from apps.forecast.models import Product, Category, ForecastCache
from apps.analytics.models import DailyMetrics, Order, AdMetric, AdCampaign
from apps.inventory.models import InventorySnapshot, Shipment, ShipmentItem, VineClaim
from apps.authentication.models import User, UserProfile


class Command(BaseCommand):
    help = 'Migrate data from legacy systems to Django'
    
    def __init__(self):
        # Connect to legacy databases
        self.forecast_conn = psycopg2.connect(
            host=os.environ.get('FORECAST_DB_HOST'),
            database=os.environ.get('FORECAST_DB_NAME'),
            user=os.environ.get('FORECAST_DB_USER'),
            password=os.environ.get('FORECAST_DB_PASSWORD')
        )
        
        self.bananas_conn = psycopg2.connect(
            host=os.environ.get('BANANAS_DB_HOST'),
            database=os.environ.get('BANANAS_DB_NAME'),
            user=os.environ.get('BANANAS_DB_USER'),
            password=os.environ.get('BANANAS_DB_PASSWORD')
        )
    
    def handle(self, *args, **options):
        """Main migration process"""
        
        self.stdout.write(self.style.SUCCESS('Starting data migration...'))
        
        try:
            with transaction.atomic():
                # Phase 1: Migrate categories
                self.migrate_categories()
                
                # Phase 2: Migrate products
                self.migrate_products()
                
                # Phase 3: Migrate users
                self.migrate_users()
                
                # Phase 4: Migrate forecast data
                self.migrate_forecast_data()
                
                # Phase 5: Migrate analytics data
                self.migrate_analytics_data()
                
                # Phase 6: Migrate inventory data
                self.migrate_inventory_data()
                
                # Phase 7: Validate migration
                self.validate_migration()
                
                self.stdout.write(self.style.SUCCESS('Migration completed successfully!'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Migration failed: {str(e)}'))
            raise
    
    def migrate_categories(self):
        """Migrate product categories"""
        self.stdout.write('Migrating categories...')
        
        query = "SELECT DISTINCT category FROM products WHERE category IS NOT NULL"
        forecast_categories = pd.read_sql(query, self.forecast_conn)
        bananas_categories = pd.read_sql(query, self.bananas_conn)
        
        # Merge and deduplicate
        all_categories = pd.concat([forecast_categories, bananas_categories]).drop_duplicates()
        
        for _, row in all_categories.iterrows():
            Category.objects.get_or_create(
                name=row['category'],
                defaults={'is_active': True}
            )
        
        self.stdout.write(f'Created {len(all_categories)} categories')
    
    def migrate_products(self):
        """Migrate product data from both systems"""
        self.stdout.write('Migrating products...')
        
        # Get products from forecast system
        forecast_products = pd.read_sql("""
            SELECT DISTINCT ON (asin) 
                asin, parent_asin, product_name, release_date, category, brand
            FROM products 
            WHERE asin IS NOT NULL
            ORDER BY asin, created_at DESC
        """, self.forecast_conn)
        
        # Get products from bananas system
        bananas_products = pd.read_sql("""
            SELECT DISTINCT ON (asin) 
                asin, sku, product_name, release_date, category, brand
            FROM products 
            WHERE asin IS NOT NULL
            ORDER BY asin, created_at DESC
        """, self.bananas_conn)
        
        # Merge data
        merged_products = self.merge_product_data(forecast_products, bananas_products)
        
        # Create products
        products_created = 0
        for _, row in merged_products.iterrows():
            category = None
            if row['category']:
                category = Category.objects.filter(name=row['category']).first()
            
            product, created = Product.objects.get_or_create(
                asin=row['asin'],
                defaults={
                    'parent_asin': row.get('parent_asin'),
                    'sku': row.get('sku'),
                    'name': row['product_name'],
                    'brand': row.get('brand'),
                    'category': category,
                    'release_date': row['release_date'],
                    'is_active': True
                }
            )
            
            if created:
                products_created += 1
        
        self.stdout.write(f'Created {products_created} products')
    
    def merge_product_data(self, forecast_df, bananas_df):
        """Merge product data from both systems"""
        
        # Merge on ASIN
        merged = pd.merge(
            forecast_df,
            bananas_df,
            on='asin',
            how='outer',
            suffixes=('_forecast', '_bananas')
        )
        
        # Combine data preferring forecast system for core data
        merged['product_name'] = merged['product_name_forecast'].combine_first(merged['product_name_bananas'])
        merged['category'] = merged['category_forecast'].combine_first(merged['category_bananas'])
        merged['brand'] = merged['brand_forecast'].combine_first(merged['brand_bananas'])
        merged['release_date'] = merged['release_date_forecast'].combine_first(merged['release_date_bananas'])
        merged['parent_asin'] = merged['parent_asin_forecast']
        merged['sku'] = merged['sku_bananas']
        
        # Clean up
        merged = merged[[
            'asin', 'parent_asin', 'sku', 'product_name', 
            'release_date', 'category', 'brand'
        ]]
        
        return merged.drop_duplicates(subset=['asin'])
    
    def migrate_forecast_data(self):
        """Migrate forecast cache and settings"""
        self.stdout.write('Migrating forecast data...')
        
        # Migrate forecast cache
        forecast_cache = pd.read_sql("""
            SELECT fc.asin, fc.forecast_date, fc.units_to_make, 
                   fc.current_doi, fc.cumulative_data, fc.status,
                   fc.algorithm_version, fc.calculation_time
            FROM forecast_cache fc
            JOIN products p ON fc.asin = p.asin
            WHERE p.is_active = TRUE
              AND fc.forecast_date >= CURRENT_DATE - INTERVAL '90 days'
        """, self.forecast_conn)
        
        cache_entries_created = 0
        for _, row in forecast_cache.iterrows():
            try:
                product = Product.objects.get(asin=row['asin'])
                
                ForecastCache.objects.get_or_create(
                    product=product,
                    algorithm_version=row['algorithm_version'],
                    forecast_date=row['forecast_date'],
                    defaults={
                        'units_to_make': row['units_to_make'],
                        'current_doi': row['current_doi'],
                        'cumulative_data': row.get('cumulative_data', {}),
                        'status': row.get('status', 'good'),
                        'calculation_time': row.get('calculation_time', 0)
                    }
                )
                cache_entries_created += 1
                
            except Product.DoesNotExist:
                continue
        
        self.stdout.write(f'Created {cache_entries_created} forecast cache entries')
    
    def validate_migration(self):
        """Validate migrated data"""
        self.stdout.write('Validating migration...')
        
        # Check product counts
        forecast_count = self.forecast_conn.cursor().execute("SELECT COUNT(*) FROM products").fetchone()[0]
        bananas_count = self.bananas_conn.cursor().execute("SELECT COUNT(*) FROM products").fetchone()[0]
        django_count = Product.objects.count()
        
        self.stdout.write(f"Products migrated: {django_count} (Forecast: {forecast_count}, Bananas: {bananas_count})")
        
        # Check data integrity
        products_without_category = Product.objects.filter(category__isnull=True, is_active=True).count()
        self.stdout.write(f"Products without category: {products_without_category}")
        
        # Validate forecast algorithms can run
        sample_products = Product.objects.filter(is_active=True)[:5]
        service = ForecastService()
        
        for product in sample_products:
            try:
                cache = ForecastCache.objects.filter(product=product).first()
                self.stdout.write(f"Product {product.asin}: {cache.status if cache else 'No cache'}")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Validation failed for {product.asin}: {e}"))
```

### Phase 6: Testing and Validation (Week 6-7)

#### 6.1 Create Comprehensive Tests

```python
# tests/test_integration.py
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.forecast.models import Product, ForecastCache
from apps.analytics.models import DailyMetrics
from apps.forecast.services import ForecastService

User = get_user_model()


class ForecastIntegrationTest(TestCase):
    """Integration tests for forecast system"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create test product
        self.product = Product.objects.create(
            asin='B08N5WRWNW',
            name='Test Product',
            release_date='2023-01-01'
        )
        
        # Create test historical data
        self.create_historical_data()
    
    def create_historical_data(self):
        """Create test historical data"""
        
        # Create daily metrics for the past 30 days
        from datetime import date, timedelta
        
        for i in range(30):
            metric_date = date.today() - timedelta(days=i)
            DailyMetrics.objects.create(
                product=self.product,
                date=metric_date,
                units_sold=10 + (i % 5),
                revenue=100 + (i * 10),
                orders=5 + (i % 3),
                sessions=100 + (i * 5),
                conversion_rate=0.05,
                ad_spend=20 + (i * 2),
                ad_sales=50 + (i * 5)
            )
    
    def test_single_product_forecast(self):
        """Test getting forecast for single product"""
        
        url = f'/api/v1/forecast/{self.product.asin}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('units_to_make', response.data)
        self.assertIn('current_doi', response.data)
        self.assertIn('status', response.data)
        self.assertIn('cumulative_data', response.data)
    
    def test_bulk_forecast(self):
        """Test bulk forecast endpoint"""
        
        # Create additional products
        for i in range(5):
            Product.objects.create(
                asin=f'B08N5WRWN{i}',
                name=f'Test Product {i}',
                release_date='2023-01-01'
            )
        
        url = '/api/v1/forecast/bulk/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)
        self.assertGreater(response.data['count'], 0)
    
    def test_forecast_caching(self):
        """Test that forecasts are properly cached"""
        
        url = f'/api/v1/forecast/{self.product.asin}/'
        
        # First request (cache miss)
        start_time = time.time()
        response1 = self.client.get(url)
        first_request_time = time.time() - start_time
        
        # Second request (cache hit)
        start_time = time.time()
        response2 = self.client.get(url)
        second_request_time = time.time() - start_time
        
        self.assertEqual(response1.data, response2.data)
        self.assertLess(second_request_time, first_request_time)
    
    def test_doi_recalculation(self):
        """Test DOI recalculation with new settings"""
        
        url = '/api/v1/forecast/recalculate-doi/'
        data = {
            'amazon_doi_goal': 120,
            'inbound_lead_time': 45,
            'manufacture_lead_time': 14
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('recalculated_products', response.data)
    
    def test_forecast_algorithm_selection(self):
        """Test that correct algorithm is selected based on product age"""
        
        service = ForecastService()
        algorithm = service.get_algorithm_for_product(self.product)
        
        # Product is 12+ months old, should use mature product algorithm
        self.assertEqual(algorithm.get_algorithm_name(), 'mature_product_v2.2')
    
    def test_performance_insights(self):
        """Test performance analytics and insights"""
        
        url = '/api/v1/analytics/performance/'
        params = {
            'asin': self.product.asin,
            'start_date': '2024-01-01',
            'end_date': '2024-01-31',
            'compare_to': 'previous_period'
        }
        
        response = self.client.get(url, params)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('current_metrics', response.data)
        self.assertIn('comparison_metrics', response.data)
        self.assertIn('insights', response.data)
    
    def test_graphql_endpoint(self):
        """Test GraphQL API functionality"""
        
        query = '''
        query {
            product(asin: "B08N5WRWNW") {
                asin
                name
                forecast {
                    unitsToMake
                    currentDoi
                    status
                }
                metrics(startDate: "2024-01-01", endDate: "2024-01-31") {
                    date
                    unitsSold
                    revenue
                }
            }
        }
        '''
        
        url = '/api/v1/graphql/'
        response = self.client.post(url, {'query': query}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('data', response.data)
        self.assertIn('product', response.data['data'])


class LoadTest(TestCase):
    """Load testing for API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='loadtestuser',
            email='loadtest@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create test data
        self.create_test_data()
    
    def create_test_data(self):
        """Create large dataset for load testing"""
        
        # Create 1000 products
        products = []
        for i in range(1000):
            products.append(Product(
                asin=f'B08N5WRW{i:04d}',
                name=f'Test Product {i}',
                release_date='2023-01-01'
            ))
        Product.objects.bulk_create(products)
        
        # Create metrics for each product
        from datetime import date, timedelta
        
        metrics = []
        for product in Product.objects.all()[:100]:  # Limit for performance
            for i in range(365):  # Full year of data
                metric_date = date(2024, 1, 1) + timedelta(days=i)
                metrics.append(DailyMetrics(
                    product=product,
                    date=metric_date,
                    units_sold=10,
                    revenue=100,
                    orders=5,
                    sessions=100,
                    conversion_rate=0.05
                ))
        
        DailyMetrics.objects.bulk_create(metrics, batch_size=1000)
    
    def test_bulk_forecast_performance(self):
        """Test performance of bulk forecast endpoint"""
        
        url = '/api/v1/forecast/bulk/'
        
        import time
        start_time = time.time()
        response = self.client.get(url)
        end_time = time.time()
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(end_time - start_time, 5.0)  # Should complete in under 5 seconds
```

## Deployment Strategy

### Local Development Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd mvp3-django

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements/development.txt

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your local settings

# 5. Set up database
python manage.py migrate
python manage.py createsuperuser

# 6. Run data migration (if needed)
python manage.py migrate_data

# 7. Start development server
python manage.py runserver

# 8. Start Celery worker (in separate terminal)
celery -A config worker -l info

# 9. Start Celery beat (in separate terminal)
celery -A config beat -l info
```

### Production Deployment

```bash
# 1. Build Docker image
docker build -t mvp3-django:latest .

# 2. Run with Docker Compose
docker-compose up -d

# 3. Run migrations
docker-compose exec web python manage.py migrate

# 4. Collect static files
docker-compose exec web python manage.py collectstatic --noinput

# 5. Create superuser
docker-compose exec web python manage.py createsuperuser

# 6. Verify deployment
curl -f http://localhost/health/ || exit 1
```

This implementation guide provides a comprehensive roadmap for building your Django-based monorepo system. The architecture is designed to be scalable, maintainable, and to preserve the proven algorithms from both legacy systems while providing a unified, modern API interface.