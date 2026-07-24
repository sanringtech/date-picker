import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonDirective } from '../ui/button';
import { docsTopNavItems } from '../../navigation/docs-navigation';

@Component({
  selector: 'app-navigation',
  imports: [RouterLink, RouterLinkActive, ButtonDirective],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.css',
})
export class NavigationComponent {
  protected readonly items = docsTopNavItems;
}
