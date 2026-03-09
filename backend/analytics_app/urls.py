from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VineClaimViewSet, ActionItemViewSet

router = DefaultRouter()
router.register(r'vine-claims', VineClaimViewSet, basename='vine-claim')
router.register(r'action-items', ActionItemViewSet, basename='action-item')

urlpatterns = [
    path('', include(router.urls)),
]
