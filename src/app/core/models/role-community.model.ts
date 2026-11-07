export interface CommunityActivity {
  title: string;
  date?: Date;
  location: string;
  mode: 'Presencial' | 'Online' | 'Mixto';
  url: string;
}

export interface RoleCommunity {
  id: string;
  name: string;
  description: string;
  zone: string;
  instagramUrl: string;
  discordUrl: string;
  websiteUrl: string;
  activities: CommunityActivity[];
  updatedAt?: Date;
}

export interface CommunityAdminRequestInput {
  name: string;
  description: string;
  zone: string;
  instagramUrl: string;
  discordUrl: string;
  websiteUrl: string;
}
