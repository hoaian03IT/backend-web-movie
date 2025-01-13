import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint()
export class IsStrongPasswordConstraint
  implements ValidatorConstraintInterface
{
  validate(value: string, validationArguments?: ValidationArguments): boolean {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#_&.])[A-Za-z\d!@#_&.]{8,64}$/;
    return typeof value === 'string' && regex.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `'${args.property}' must contain at least 8 characters, including 1 uppercase letter, 1 number, and 1 special character.`;
  }
}
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
