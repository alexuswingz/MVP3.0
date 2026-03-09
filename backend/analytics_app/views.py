from rest_framework import viewsets, permissions, status
from rest_framework.filters import OrderingFilter
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.http import HttpResponse
from datetime import date
from io import StringIO
import csv

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

    @action(detail=False, methods=['get'])
    def export(self, request):
        """
        Export Vine products as CSV, aggregated per product.

        Supports:
        - filterset_fields: product, review_received
        - ordering: claim_date, units_claimed, id
        - search: case-insensitive match on product name, brand name, ASIN, or status label
        """
        queryset = self.filter_queryset(self.get_queryset())

        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(product__name__icontains=search)
                | Q(product__asin__icontains=search)
                | Q(product__brand__name__icontains=search)
            )

        # Aggregate per product similar to frontend vine tracker
        rows_by_product = {}
        for claim in queryset:
            product = claim.product
            product_id = product.id
            row = rows_by_product.get(product_id)
            if row is None:
                # Default status based on this claim; will adjust below if needed
                status_label = 'Concluded' if claim.review_received else 'Awaiting Reviews'
                launch_date = (
                    product.launch_date.isoformat() if product.launch_date else ''
                )
                enrolled = 0
                try:
                    enrolled = int(
                        getattr(getattr(product, 'extended', None), 'vine_units_enrolled', 0)
                        or 0
                    )
                except Exception:
                    enrolled = 0

                row = {
                    'status': status_label,
                    'product_name': product.name or '',
                    'brand': product.brand.name if product.brand else '',
                    'size': product.size or '',
                    'asin': product.asin or '',
                    'launch_date': launch_date,
                    'claimed': 0,
                    'enrolled': enrolled,
                }
                rows_by_product[product_id] = row

            # If any claim is not concluded, overall status should be Awaiting Reviews
            if not claim.review_received:
                row['status'] = 'Awaiting Reviews'

            row['claimed'] += int(claim.units_claimed or 0)

        buffer = StringIO()
        writer = csv.writer(buffer)

        writer.writerow(
            ['Status', 'Product Name', 'Brand', 'Size', 'ASIN', 'Launch Date', 'Claimed', 'Enrolled']
        )

        for row in rows_by_product.values():
            writer.writerow(
                [
                    row['status'],
                    row['product_name'],
                    row['brand'],
                    row['size'],
                    row['asin'],
                    row['launch_date'],
                    row['claimed'],
                    row['enrolled'],
                ]
            )

        buffer.seek(0)
        filename = f'vine_export_{date.today().isoformat()}.csv'
        response = HttpResponse(buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
