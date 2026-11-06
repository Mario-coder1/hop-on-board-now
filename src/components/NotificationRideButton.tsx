import { Link } from 'react-router-dom';
import { Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { rideLinkFromMessage } from '@/lib/notificationLink';

export default function NotificationRideButton({ message, onClick, className }: { message: string; onClick?: () => void; className?: string }) {
  const to = rideLinkFromMessage(message);
  if (!to) return null;
  return (
    <Button asChild size="sm" className={className ?? 'mt-2'}>
      <Link to={to} onClick={onClick}><Car className="w-4 h-4 mr-1" />Pripojiť sa a rezervovať</Link>
    </Button>
  );
}
