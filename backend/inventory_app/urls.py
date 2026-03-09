from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShipmentViewSet, ShipmentItemViewSet, InventoryViewSet, ShipmentProductsExportView

router = DefaultRouter()
router.register(r'shipments', ShipmentViewSet, basename='shipment')
router.register(r'shipment-items', ShipmentItemViewSet, basename='shipment-item')
router.register(r'inventory', InventoryViewSet, basename='inventory')

urlpatterns = [
    path('', include(router.urls)),
    path('shipment-products/export/', ShipmentProductsExportView.as_view(), name='shipment-products-export'),
]
