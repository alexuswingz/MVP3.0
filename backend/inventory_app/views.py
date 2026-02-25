from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone

from .models import Shipment, ShipmentItem, CurrentInventory
from .serializers import (
    ShipmentListSerializer,
    ShipmentDetailSerializer,
    ShipmentCreateSerializer,
    ShipmentItemSerializer,
    CurrentInventorySerializer,
)


class ShipmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for shipment CRUD operations.
    
    list: GET /api/v1/shipments/
    create: POST /api/v1/shipments/
    retrieve: GET /api/v1/shipments/{id}/
    update: PUT /api/v1/shipments/{id}/
    partial_update: PATCH /api/v1/shipments/{id}/
    destroy: DELETE /api/v1/shipments/{id}/
    
    Custom actions:
    - book: POST /api/v1/shipments/{id}/book/
    - ship: POST /api/v1/shipments/{id}/ship/
    - receive: POST /api/v1/shipments/{id}/receive/
    - cancel: POST /api/v1/shipments/{id}/cancel/
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter shipments to current user only"""
        queryset = Shipment.objects.filter(user=self.request.user)
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            if status_param == 'active':
                queryset = queryset.exclude(status__in=['received', 'cancelled'])
            elif status_param == 'archived':
                queryset = queryset.filter(status__in=['received', 'cancelled'])
            else:
                queryset = queryset.filter(status=status_param)
        
        # Filter by shipment type
        shipment_type = self.request.query_params.get('shipment_type')
        if shipment_type:
            queryset = queryset.filter(shipment_type=shipment_type)
        
        # Search by name or Amazon shipment ID
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(amazon_shipment_id__icontains=search) |
                Q(amazon_reference_id__icontains=search) |
                Q(shipment_id__icontains=search)
            )
        
        # Ordering
        ordering = self.request.query_params.get('ordering', '-created_at')
        if ordering:
            queryset = queryset.order_by(ordering)
        
        return queryset.prefetch_related('items', 'items__product')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return ShipmentListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ShipmentCreateSerializer
        return ShipmentDetailSerializer
    
    def perform_create(self, serializer):
        """Save the shipment - user is set in serializer.create()"""
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def book(self, request, pk=None):
        """
        Book a shipment - transition from planning to ready, or update booking details on an already ready shipment.
        Can include shipment details in the request body.
        """
        shipment = self.get_object()
        
        if shipment.status not in ('planning', 'ready'):
            return Response(
                {'error': f'Cannot book shipment in {shipment.status} status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update shipment with provided data
        update_fields = []
        if shipment.status == 'planning':
            shipment.status = 'ready'
            update_fields.append('status')
        
        # Optional fields to update
        if 'amazon_shipment_id' in request.data:
            shipment.amazon_shipment_id = request.data['amazon_shipment_id']
            update_fields.append('amazon_shipment_id')
        
        if 'amazon_reference_id' in request.data:
            shipment.amazon_reference_id = request.data['amazon_reference_id']
            update_fields.append('amazon_reference_id')
        
        if 'ship_from_name' in request.data:
            shipment.ship_from_name = request.data['ship_from_name']
            update_fields.append('ship_from_name')
        
        if 'ship_from_address' in request.data:
            shipment.ship_from_address = request.data['ship_from_address']
            update_fields.append('ship_from_address')
        
        if 'destination_center' in request.data:
            shipment.destination_center = request.data['destination_center']
            update_fields.append('destination_center')
        
        if 'planned_ship_date' in request.data:
            shipment.planned_ship_date = request.data['planned_ship_date']
            update_fields.append('planned_ship_date')
        
        if 'notes' in request.data:
            shipment.notes = request.data['notes']
            update_fields.append('notes')
        
        shipment.save(update_fields=update_fields)
        
        serializer = ShipmentDetailSerializer(shipment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def ship(self, request, pk=None):
        """
        Mark shipment as shipped.
        """
        shipment = self.get_object()
        
        if shipment.status not in ['planning', 'ready']:
            return Response(
                {'error': f'Cannot ship from {shipment.status} status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        shipment.status = 'shipped'
        shipment.actual_ship_date = request.data.get(
            'actual_ship_date', 
            timezone.now().date()
        )
        
        # Update shipped quantities
        for item in shipment.items.all():
            item.quantity_shipped = item.quantity_planned
            item.save(update_fields=['quantity_shipped'])
        
        shipment.save(update_fields=['status', 'actual_ship_date'])
        
        serializer = ShipmentDetailSerializer(shipment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        """
        Mark shipment as received.
        Can include received quantities for items.
        """
        shipment = self.get_object()
        
        if shipment.status not in ['shipped', 'in_transit', 'receiving']:
            return Response(
                {'error': f'Cannot receive from {shipment.status} status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        shipment.status = 'received'
        shipment.actual_arrival = request.data.get(
            'actual_arrival',
            timezone.now().date()
        )
        
        # Update received quantities
        items_data = request.data.get('items', [])
        if items_data:
            for item_data in items_data:
                item_id = item_data.get('id')
                quantity_received = item_data.get('quantity_received')
                if item_id and quantity_received is not None:
                    try:
                        item = shipment.items.get(id=item_id)
                        item.quantity_received = quantity_received
                        item.save(update_fields=['quantity_received'])
                    except ShipmentItem.DoesNotExist:
                        pass
        else:
            # Default: mark all as fully received
            for item in shipment.items.all():
                item.quantity_received = item.quantity_shipped or item.quantity_planned
                item.save(update_fields=['quantity_received'])
        
        # Update received units total
        shipment.received_units = sum(
            item.quantity_received for item in shipment.items.all()
        )
        
        shipment.save(update_fields=['status', 'actual_arrival', 'received_units'])
        
        serializer = ShipmentDetailSerializer(shipment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel a shipment.
        """
        shipment = self.get_object()
        
        if shipment.status in ['received', 'cancelled']:
            return Response(
                {'error': f'Cannot cancel shipment in {shipment.status} status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        shipment.status = 'cancelled'
        shipment.notes = f"{shipment.notes}\n\nCancelled on {timezone.now().strftime('%Y-%m-%d %H:%M')}"
        shipment.save(update_fields=['status', 'notes'])
        
        serializer = ShipmentDetailSerializer(shipment)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get shipment statistics.
        """
        queryset = Shipment.objects.filter(user=request.user)
        
        stats = {
            'total': queryset.count(),
            'planning': queryset.filter(status='planning').count(),
            'ready': queryset.filter(status='ready').count(),
            'shipped': queryset.filter(status='shipped').count(),
            'in_transit': queryset.filter(status='in_transit').count(),
            'receiving': queryset.filter(status='receiving').count(),
            'received': queryset.filter(status='received').count(),
            'cancelled': queryset.filter(status='cancelled').count(),
            'by_type': {
                'fba': queryset.filter(shipment_type='fba').count(),
                'awd': queryset.filter(shipment_type='awd').count(),
            },
            'total_units_planning': sum(
                s.total_units for s in queryset.filter(status='planning')
            ),
            'total_units_in_transit': sum(
                s.total_units for s in queryset.filter(status__in=['shipped', 'in_transit'])
            ),
        }
        
        return Response(stats)


class ShipmentItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing individual shipment items.
    Typically used for updating quantities after shipment creation.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ShipmentItemSerializer
    
    def get_queryset(self):
        """Filter to items in user's shipments"""
        return ShipmentItem.objects.filter(
            shipment__user=self.request.user
        ).select_related('product', 'product__brand', 'shipment')
    
    def perform_update(self, serializer):
        """Update totals on parent shipment after item update"""
        instance = serializer.save()
        shipment = instance.shipment
        
        # Recalculate totals
        shipment.total_units = sum(
            item.quantity_planned for item in shipment.items.all()
        )
        shipment.received_units = sum(
            item.quantity_received for item in shipment.items.all()
        )
        shipment.save(update_fields=['total_units', 'received_units'])


class InventoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing inventory (read-only).
    Inventory is updated via sync processes, not directly.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CurrentInventorySerializer
    
    def get_queryset(self):
        """Filter inventory to current user's products"""
        return CurrentInventory.objects.filter(
            product__user=self.request.user
        ).select_related('product', 'product__brand')
