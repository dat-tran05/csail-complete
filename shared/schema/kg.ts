export interface Person {
  id: string;
  name: string;
  affiliation: string;
  groupIds: string[];
  roomIds: string[];
  bio?: string;
  homepage?: string;
  photoUrl?: string;
}

export interface Group {
  id: string;
  name: string;
  shortName?: string;
  url?: string;
  roomIds: string[];
  memberIds: string[];
  color?: string;
}
