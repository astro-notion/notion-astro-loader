import { z } from 'astro/zod';
import * as propertyType from './raw-properties.js';
import { dateToDateObjects, richTextToPlainText } from '../format.js';

type TransformedSchema<Schema extends z.ZodTypeAny, Output> = z.ZodType<Output, z.input<Schema>>;

export const number: TransformedSchema<typeof propertyType.number, number | null> = propertyType.number.transform(
  (property) => property.number
);
export const url: TransformedSchema<typeof propertyType.url, string | null> = propertyType.url.transform(
  (property) => property.url
);
export const email: TransformedSchema<typeof propertyType.email, string | null> = propertyType.email.transform(
  (property) => property.email
);
export const phone_number: TransformedSchema<typeof propertyType.phone_number, string | null> =
  propertyType.phone_number.transform((property) => property.phone_number);
export const checkbox: TransformedSchema<typeof propertyType.checkbox, boolean> = propertyType.checkbox.transform(
  (property) => property.checkbox
);

export const select: TransformedSchema<typeof propertyType.select, string | null> = propertyType.select.transform(
  (property) => property.select?.name ?? null
);
export const multi_select: TransformedSchema<typeof propertyType.multi_select, string[]> =
  propertyType.multi_select.transform((property) => property.multi_select.map((option) => option.name) ?? []);
export const status: TransformedSchema<typeof propertyType.status, string | null> = propertyType.status.transform(
  (property) => property.status?.name ?? null
);

export const title: TransformedSchema<typeof propertyType.title, string> = propertyType.title.transform((property) =>
  richTextToPlainText(property.title)
);
export const rich_text: TransformedSchema<typeof propertyType.rich_text, string> = propertyType.rich_text.transform(
  (property) => richTextToPlainText(property.rich_text)
);

export const date: TransformedSchema<
  typeof propertyType.date,
  ReturnType<typeof dateToDateObjects>
> = propertyType.date.transform((property) => dateToDateObjects(property.date));
export const created_time: TransformedSchema<typeof propertyType.created_time, Date> =
  propertyType.created_time.transform((property) => new Date(property.created_time));
