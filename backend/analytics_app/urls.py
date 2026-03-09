from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VineClaimViewSet, ActionItemsExportView

router = DefaultRouter()
router.register(r'vine-claims', VineClaimViewSet, basename='vine-claim')

urlpatterns = [
    path('', include(router.urls)),
    path('action-items/export/', ActionItemsExportView.as_view(), name='action-items-export'),
]
