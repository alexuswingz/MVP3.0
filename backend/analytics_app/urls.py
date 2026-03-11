from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VineClaimViewSet, ActionItemsExportView, ActionItemViewSet

router = DefaultRouter()
router.register(r'vine-claims', VineClaimViewSet, basename='vine-claim')
router.register(r'action-items', ActionItemViewSet, basename='action-item')

# Important: register the explicit export route BEFORE the router include so
# that `/action-items/export/` does not get captured by the `action-items`
# ViewSet detail route with `pk="export"`.
urlpatterns = [
    path('action-items/export/', ActionItemsExportView.as_view(), name='action-items-export'),
    path('', include(router.urls)),
]
