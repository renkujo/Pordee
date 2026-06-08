export type AccountAvatarPreset = {
  id: string;
  index: number;
  src: string;
};

export const accountAvatarPresets: AccountAvatarPreset[] = [
  {
    id: "human-line-art-01",
    index: 1,
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-01.png",
  },
  {
    id: "human-line-art-02",
    index: 2,
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-02.png",
  },
  {
    id: "human-line-art-03",
    index: 3,
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-03.png",
  },
  {
    id: "human-line-art-04",
    index: 4,
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-04.png",
  },
  {
    id: "human-line-art-05",
    index: 5,
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-05.png",
  },
  {
    id: "human-line-art-06",
    index: 6,
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-06.png",
  },
  {
    id: "human-line-art-07",
    index: 7,
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-07.png",
  },
  {
    id: "human-line-art-08",
    index: 8,
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-08.png",
  },
  {
    id: "human-line-art-09",
    index: 9,
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-09.png",
  },
  {
    id: "human-line-art-10",
    index: 10,
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-10.png",
  },
  {
    id: "human-line-art-11",
    index: 11,
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-11.png",
  },
  {
    id: "human-line-art-12",
    index: 12,
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-12.png",
  },
];

export const getAccountAvatarPresetById = (id: string | null | undefined) => {
  if (!id) return undefined;
  return accountAvatarPresets.find((preset) => preset.id === id);
};

export const isAccountAvatarPresetId = (
  id: string
): id is AccountAvatarPreset["id"] => {
  return accountAvatarPresets.some((preset) => preset.id === id);
};
