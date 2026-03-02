from rest_framework import viewsets, permissions, status
from rest_framework.filters import OrderingFilter
from rest_framework.decorators import action
from rest_framework.response import Response
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

    @action(detail=False, methods=['post'], url_path='set-status')
    def set_status(self, request):
        """
        Persist Vine status by bulk-updating review_received for all claims of a product.

        Payload:
          - product_id: number
          - status: "Awaiting Reviews" | "Concluded"
        """
        product_id = request.data.get('product_id')
        status_label = request.data.get('status')
        if product_id in (None, '', 0) or status_label not in ('Awaiting Reviews', 'Concluded'):
            return Response(
                {'detail': 'Invalid product_id or status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        review_received = True if status_label == 'Concluded' else False
        qs = VineClaim.objects.filter(product__user=request.user, product_id=product_id)
        updated = qs.update(review_received=review_received)
        return Response({'updated': updated, 'review_received': review_received})
