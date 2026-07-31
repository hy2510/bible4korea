export interface FriendListItem {
  username: string;
  displayName: string;
  affiliation: string | null;
  addedAt: string;
}

export interface FriendListResponse {
  addedByMe: FriendListItem[];
  addedMe: FriendListItem[];
}

export interface FriendshipStatusResponse {
  isFriend: boolean;
}

export interface FriendDiscoveryItem {
  username: string;
  displayName: string;
  affiliation: string | null;
  isFriend: boolean;
}

export interface FriendDiscoveryResponse {
  items: FriendDiscoveryItem[];
  affiliation: string | null;
  page: number;
  totalPages: number;
  total: number;
}
