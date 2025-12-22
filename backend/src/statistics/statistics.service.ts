import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async getStatistics(locationId?: string) {
    const where: any = {};
    if (locationId) {
      where.location_id = locationId;
    }

    const bookings = await this.prisma.bookings.findMany({ where });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const todaysBookings = bookings.filter(b => {
      const bookingDate = new Date(b.booking_date);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate.toISOString().split('T')[0] === todayStr;
    });

    const totalRevenue = bookings.reduce((sum, b) => {
      return sum + parseFloat(b.total_price.toString() || '0');
    }, 0);

    const todaysRevenue = todaysBookings.reduce((sum, b) => {
      return sum + parseFloat(b.total_price.toString() || '0');
    }, 0);

    return {
      totalBookings: bookings.length,
      todaysBookings: todaysBookings.length,
      totalRevenue,
      todaysRevenue,
      pendingBookings: bookings.filter(b => b.status === 'pending').length,
      confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    };
  }
}

