from rest_framework import viewsets, permissions
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import VineClaim
from .serializers import VineClaimSerializer


class VineClaimViewSet(viewsets.ModelViewSet):
    """CRUD for Amazon Vine claims. Scoped to current user's products."""
    serializer_class = VineClaimSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['product', 'review_received']
    ordering_fields = ['claim_date', 'units_claimed', 'id']
    ordering = ['-claim_date']

    def get_queryset(self):
        return VineClaim.objects.filter(
            product__user=self.request.user
        ).select_related('product', 'product__brand')
