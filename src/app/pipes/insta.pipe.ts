import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'instagram',
})
export class InstagramPipe implements PipeTransform {
  transform(value: string): string {
    const username = value.replace(/\s/g, '').replace(/@/g, '');
    return `@${username}`;
  }
}
