// frontend/src/components/CategorySelector.tsx
"use client";

import { AsyncSearchSelect } from "@/components/ui/AsyncSearchSelect";
import { useCategorySelector, Category } from "@/hooks/useCategorySelector";
import type { AsyncOption } from "@/components/ui/AsyncSearchSelect";

export function CategorySelector(props: {
  value: string | null;
  onSelect: (id: string | null) => void;

  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;

  fetchUrl?: string;
  allowReactivatePrompt?: boolean;

  onCreateOptionOverride?: (label: string) => Promise<AsyncOption | null>;
  isModalActionLoading?: boolean;
}) {
  const s = useCategorySelector({
    categories: props.categories,
    setCategories: props.setCategories,
    onSelect: props.onSelect,
    fetchUrl: props.fetchUrl,
    allowReactivatePrompt: props.allowReactivatePrompt,
    onCreateOptionOverride: props.onCreateOptionOverride,
    isModalActionLoading: props.isModalActionLoading,
  });

  return (
    <AsyncSearchSelect
      value={props.value}
      onChange={s.onChange}
      fetchUrl={s.fetchUrl}
      queryParam="search"
      placeholder="Buscar..."
      initialOptions={s.initialOptions}
      creatable={true}
      onCreateOption={s.onCreateOption}
    />
  );
}
