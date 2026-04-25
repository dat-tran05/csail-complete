export type Polygon = [number, number][];

export type RoomType = "office" | "lab" | "conference" | "common" | "service" | "corridor";

export interface Room {
  id: string;
  number: string;
  floor: number;
  polygon: Polygon;
  type: RoomType;
  label?: string;
}
