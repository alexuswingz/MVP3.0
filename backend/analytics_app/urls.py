from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VineClaimViewSet

router = DefaultRouter()
router.register(r'vine-claims', VineClaimViewSet, basename='vine-claim')

urlpatterns = [
    path('', include(router.urls)),
]
