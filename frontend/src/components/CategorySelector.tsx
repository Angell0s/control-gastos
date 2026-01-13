// frontend/src/components/CategorySelector.tsx
"use client";

import { AsyncSearchSelect } from "@/components/ui/AsyncSearchSelect";
import { useCategorySelector, type Category } from "@/hooks/useCategorySelector";

export function CategorySelector(props: {
  value: string | null;
  onSelect: (id: string | null) => void;

  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;

  fetchUrl?: string;
  allowReactivatePrompt?: boolean;
  isModalActionLoading?: boolean;

  onReactivateConfirm?: (cat: Category) => Promise<void> | void;
  onAfterCreate?: (newCat: Category) => Promise<void> | void;
  onAfterReactivate?: (reactivatedCat: Category) => Promise<void> | void;

  className?: string;
  placeholder?: string;
}) {
  const s = useCategorySelector({
    categories: props.categories,
    setCategories: props.setCategories,
    onSelect: props.onSelect,
    fetchUrl: props.fetchUrl,
    allowReactivatePrompt: props.allowReactivatePrompt,
    isModalActionLoading: props.isModalActionLoading,
    onReactivateConfirm: props.onReactivateConfirm,
    onAfterCreate: props.onAfterCreate,
    onAfterReactivate: props.onAfterReactivate,
  });

  return (
    <AsyncSearchSelect
      className={props.className}
      value={props.value}
      onChange={s.onChange}
      fetchUrl={s.fetchUrl}
      queryParam="search"
      placeholder={props.placeholder ?? "Buscar..."}
      initialOptions={s.initialOptions}
      creatable={true}
      onCreateOption={s.onCreateOption}
    />
  );
}
