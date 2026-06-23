export type Hive = {
  id: string;
  number: number;
  has_scale: boolean;
  note: string | null;
  created_at: string;
};

export type HiveStatus = 'green' | 'yellow' | 'red';

export type HiveWithStatus = Hive & {
  lastInspectionDate: string | null;
  hasActiveDisease: boolean;
  activeDiseaseNames: string[];
  status: HiveStatus;
};

export type SortOption = 'number' | 'date';

export type Inspection = {
  id: string;
  hive_id: string;
  date: string;
  colony_strength: 'strong' | 'medium' | 'weak';
  note: string | null;
  photo_urls: string[];
  created_at: string;
};

export type Treatment = {
  id: string;
  hive_id: string;
  date: string;
  reason: string;
  note: string | null;
  photo_urls: string[];
  created_at: string;
};

export type Harvest = {
  id: string;
  hive_id: string;
  date: string;
  frames_count: number;
  note: string | null;
  created_at: string;
};

export type Disease = {
  id: string;
  hive_id: string;
  name: string;
  detected_date: string;
  resolved_date: string | null;
  created_at: string;
};

export type Weight = {
  id: string;
  hive_id: string;
  date: string;
  weight_kg: number;
  created_at: string;
};

export type Feeding = {
  id: string;
  hive_id: string;
  date: string;
  type: string;
  amount_kg: number | null;
  note: string | null;
  created_at: string;
};

export type DiaryEntry = {
  id: string;
  date: string;
  note: string;
  created_at: string;
};

export type RootStackParamList = {
  HiveList: undefined;
  HiveDetail: { hiveId: string; hiveNumber: number };
  Stats: undefined;
  Diary: undefined;
};
