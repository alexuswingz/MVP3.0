from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AmazonAuthUrlView,
    AmazonOAuthCallbackView,
    AmazonSellerAccountViewSet,
    ConnectSelfAuthorizedView,
)

router = DefaultRouter()
router.register(r'accounts', AmazonSellerAccountViewSet, basename='amazon-account')

urlpatterns = [
    path('auth-url/', AmazonAuthUrlView.as_view(), name='amazon-auth-url'),
    path('callback/', AmazonOAuthCallbackView.as_view(), name='amazon-callback'),
    path('connect-self/', ConnectSelfAuthorizedView.as_view(), name='amazon-connect-self'),
    path('', include(router.urls)),
]
