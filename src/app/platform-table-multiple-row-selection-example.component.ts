import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { Observable, map, of, take } from 'rxjs';
import { get } from 'lodash-es';

import { FdDate, FdDatetimeModule } from '@fundamental-ngx/core/datetime';
import {
  ChildTableDataSource,
  PlatformTableModule,
  TableDataProvider,
  TableDataSource,
  TableRowSelectionChangeEvent,
  TableState,
} from '@fundamental-ngx/platform/table';
import {
  CollectionNumberFilter,
  CollectionStringFilter,
  FdpTableDataSource,
  SortDirection,
  TableChildrenDataProvider,
  TableDataSourceDirective,
  TableHeaderResizerDirective,
  TableInitialStateDirective,
  TableRow,
  TreeTableItem,
  filterByNumber,
  filterByString,
} from '@fundamental-ngx/platform/table-helpers';
import { SelectItem } from '@fundamental-ngx/platform/shared';
import { DataSourceDirective } from '@fundamental-ngx/cdk/data-source';

@Component({
  selector: 'fdp-platform-table-multiple-row-selection-example',
  templateUrl: './platform-table-multiple-row-selection-example.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    TableDataSourceDirective,
    TableHeaderResizerDirective,
    PlatformTableModule,
    TableInitialStateDirective,
    FdDatetimeModule,
  ],
})
export class PlatformTableMultipleRowSelectionExampleComponent {
  source: TableDataSource<TreeItem>;
  childSource: ChildTableDataSource<TreeItem>;

  constructor() {
    this.source = new TableDataSource(new TableDataProviderExample());
  }

  onRowSelectionChange(event: TableRowSelectionChangeEvent<TreeItem>): void {
    console.log(event);
  }
}

export type ExampleItem =
  | ParentNode
  | (Node & {
      children?: ExampleItem[];
    });

export interface ParentNode {
  name: string;
  children: ExampleItem[];
}
export interface Node {
  name: string;
  writeAccess: string;
}

export interface TreeItem extends TreeTableItem<Node, 'children'> {
  writeAccess?: string;
  name: string;
  hasChildren?: boolean;
}

export class WrappedTreeItem implements TreeItem {
  constructor(private treeItem: TreeItem, private schema: boolean | object) {}
  public get writeAccess() {
    return this.treeItem.writeAccess;
  }
  public get name() {
    return this.treeItem.name;
  }
  public get children() {
    return this.treeItem.children;
  }
  public get hasChildren() {
    return this.children !== undefined;
  }

  public get selectable() {
    return this.writeAccess == 'clientModify';
  }

  public set selected(value: boolean) {
    this.schema = value;
  }

  public get selected() {
    return this.schema == true;
  }
}

export class TableDataProviderExample extends TableDataProvider<TreeItem> {
  items: TreeItem[] = ITEMS;
  totalItems = ITEMS.length;
  selected = Selected;

  fetch(tableState?: TableState): Observable<TreeItem[]> {
    this.items = ITEMS;

    // apply searching
    if (tableState?.searchInput) {
      this.items = this.search(this.items, tableState);
    }

    this.totalItems = this.items.length;

    return of(
      this.items.map((item, index) => {
        return {
          ...item,
          selectable: item.writeAccess == 'clientModify',
        };
      })
    );
  }

  search(
    items: TreeItem[],
    { searchInput, columnKeys }: TableState
  ): TreeItem[] {
    const searchText = searchInput?.text || '';
    const keysToSearchBy = columnKeys;

    if (searchText.trim() === '' || keysToSearchBy.length === 0) {
      return items;
    }

    return items.filter((item) => {
      const valuesForSearch = keysToSearchBy.map((key) =>
        getNestedValue(key, item)
      );
      return valuesForSearch
        .filter((value) => !!value)
        .map((value): string => value.toString())
        .some((value) =>
          value.toLocaleLowerCase().includes(searchText.toLocaleLowerCase())
        );
    });
  }

  getFieldOptions(field: string): Observable<SelectItem<any>[]> {
    console.log(field);
    return this.fetch().pipe(
      take(1),
      map((data) => {
        const options: SelectItem[] = data
          .filter((item) => get(item, field) !== undefined)
          .map((item) => ({
            label: get(item, field),
            value: get(item, field),
          }));

        return options;
      })
    );
  }
}

function getNestedValue<T extends Record<string, any>>(
  key: string,
  object: T
): any {
  return key.split('.').reduce((a, b) => (a ? a[b] : null), object);
}

// function get(item: ExampleItem,field: string):boolean? {
//      return Selected[item.name][field];
// }

class SchemaDefenition {
  json: Record<string, boolean | object>;
  constructor(json: Record<string, boolean | object>) {
    this.json = json;
  }

  [x: string]: Record<string, boolean | object>;
}
// Example of guest schema
const Selected = {
  phoneNumber: true,
  profile: {
    email: true,
    firstName: true,
  },
};

// Example schema
const ITEMS: TreeItem[] = [
  {
    name: 'phoneNumber',
    writeAccess: 'clientModify',
  },
  {
    name: 'data',
    children: [
      {
        name: 'color',
        writeAccess: 'clientModify',
      },
    ],
  },
  {
    name: 'profile',
    children: [
      {
        name: 'email',
        writeAccess: 'clientModify',
      },
      {
        name: 'firstName',
        writeAccess: 'clientModify',
      },
      {
        name: 'lastName',
        writeAccess: 'clientModify',
      },
    ],
  },
];
