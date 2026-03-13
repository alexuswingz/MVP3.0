from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    BrandViewSet, ProductViewSet, PackagingTypeViewSet,
    BottleViewSet, ClosureViewSet, FormulaViewSet, DOISettingsViewSet,
    ForecastViewSet
)

router = DefaultRouter()
router.register(r'brands', BrandViewSet, basename='brand')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'packaging-types', PackagingTypeViewSet, basename='packaging-type')
router.register(r'bottles', BottleViewSet, basename='bottle')
router.register(r'closures', ClosureViewSet, basename='closure')
router.register(r'formulas', FormulaViewSet, basename='formula')
router.register(r'doi-settings', DOISettingsViewSet, basename='doi-settings')
router.register(r'forecasts', ForecastViewSet, basename='forecast')

urlpatterns = [
    path('', include(router.urls)),
]
