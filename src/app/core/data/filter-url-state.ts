import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { debounceTime } from 'rxjs';

export type FilterSchema = Record<string, readonly string[] | null>;
export function readFilters(params: ParamMap, defaults: Record<string, string>, schema: FilterSchema): Record<string, string> {
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    // First occurrence wins; never combine duplicate parameters into a different filter.
    const value = (params.getAll(key)[0] ?? '').trim();
    return [key, value && (!schema[key] || schema[key]!.includes(value)) ? value : fallback];
  }));
}
export function writeFilters(values: Record<string, string>, defaults: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()])
    .filter(([key, value]) => value !== defaults[key] && value !== ''));
}
export function bindFilterUrl(form: FormGroup, route: ActivatedRoute, router: Router, destroyRef: DestroyRef,
  schema: FilterSchema, changed: () => void): void {
  const defaults = form.getRawValue() as Record<string, string>;
  route.queryParamMap.pipe(takeUntilDestroyed(destroyRef)).subscribe(params => {
    form.patchValue(readFilters(params, defaults, schema), { emitEvent: false });
    changed();
  });
  form.valueChanges.pipe(debounceTime(250), takeUntilDestroyed(destroyRef)).subscribe(() => {
    // Read current state after the debounce: a Back/Forward navigation must cancel stale input.
    const queryParams = writeFilters(form.getRawValue(), defaults);
    const current = route.snapshot.queryParamMap;
    if (current.keys.length === Object.keys(queryParams).length &&
      Object.entries(queryParams).every(([key, value]) => current.getAll(key).length === 1 && current.get(key) === value)) return;
    void router.navigate([], { relativeTo: route, queryParams });
  });
}
