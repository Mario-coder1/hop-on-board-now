import { Plus, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddressSearch from '@/components/AddressSearch';
import { Label } from '@/components/ui/label';

export interface Stop {
  id: string;
  address: string;
  lat: number;
  lng: number;
}

interface StopsManagerProps {
  stops: Stop[];
  onStopsChange: (stops: Stop[]) => void;
  maxStops?: number;
}

const StopsManager = ({ stops, onStopsChange, maxStops = 5 }: StopsManagerProps) => {
  const addStop = () => {
    if (stops.length >= maxStops) return;
    
    const newStop: Stop = {
      id: crypto.randomUUID(),
      address: '',
      lat: 0,
      lng: 0
    };
    onStopsChange([...stops, newStop]);
  };

  const updateStop = (id: string, address: string, lat: number, lng: number) => {
    onStopsChange(
      stops.map(stop => 
        stop.id === id ? { ...stop, address, lat, lng } : stop
      )
    );
  };

  const removeStop = (id: string) => {
    onStopsChange(stops.filter(stop => stop.id !== id));
  };

  const moveStop = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === stops.length - 1)
    ) {
      return;
    }

    const newStops = [...stops];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newStops[index], newStops[targetIndex]] = [newStops[targetIndex], newStops[index]];
    onStopsChange(newStops);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Zastávky (voliteľné)</Label>
        <span className="text-xs text-muted-foreground">
          {stops.length}/{maxStops}
        </span>
      </div>

      {stops.map((stop, index) => (
        <div
          key={stop.id}
          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border"
        >
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => moveStop(index, 'up')}
              disabled={index === 0}
            >
              <GripVertical className="h-3 w-3 rotate-90" />
            </Button>
            <span className="text-xs text-muted-foreground text-center w-5">
              {index + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => moveStop(index, 'down')}
              disabled={index === stops.length - 1}
            >
              <GripVertical className="h-3 w-3 rotate-90" />
            </Button>
          </div>

          <div className="flex-1">
            <AddressSearch
              value={stop.address}
              onSelect={(address, lat, lng) => updateStop(stop.id, address, lat, lng)}
              placeholder={`Zastávka ${index + 1}`}
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => removeStop(stop.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {stops.length < maxStops && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addStop}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Pridať zastávku
        </Button>
      )}

      {stops.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Cestujúci môžu nastupovať a vystupovať na týchto zastávkach.
        </p>
      )}
    </div>
  );
};

export default StopsManager;
