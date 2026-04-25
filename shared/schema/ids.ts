export type PersonId    = `person:${string}`;
export type GroupId     = `group:${string}`;
export type ProjectId   = `project:${string}`;
export type PaperId     = `paper:${string}`;
export type NewsId      = `news:${string}`;
export type RoomId      = `room:${string}`;
export type AreaId      = `area:${string}`;

export const personId = (nodeId: string): PersonId => `person:${nodeId}`;
export const groupId = (slug: string): GroupId => `group:${slug}`;
export const projectId = (slug: string): ProjectId => `project:${slug}`;
export const paperId = (key: string): PaperId => `paper:${key}`;
export const newsId = (slug: string): NewsId => `news:${slug}`;
export const roomId = (n: string): RoomId => `room:${n}`;
export const areaId = (slug: string): AreaId => `area:${slug}`;
