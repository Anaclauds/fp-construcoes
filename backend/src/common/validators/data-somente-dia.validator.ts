import { registerDecorator, ValidationOptions } from 'class-validator';
import { parseDateOnly } from '../utils/date.util';

export function IsDataSomenteDia(
  options?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'isDataSomenteDia',
      target: target.constructor,
      propertyName: String(propertyName),
      options,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          try {
            parseDateOnly(value);
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage: (args) =>
          `${args?.property ?? 'Data'} deve ser uma data valida no formato AAAA-MM-DD`,
      },
    });
}
