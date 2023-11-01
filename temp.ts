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
    this.source = new TableDataSource(new TableTreeDataProviderExample());
    this.childSource = new ChildTableDataSource(new ChildTableProvider());
  }

  onRowSelectionChange(event: TableRowSelectionChangeEvent<ExampleItem>): void {
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

export interface TreeItem extends TreeTableItem<Node, 'fields'> {
  writeAccess?: string;
  name: string;
  hasChildren?: boolean;
  children?: TreeItem[];
}

// class PredfinedChildTableProviderExample extends TableDataProvider<TreeItem>  {
//     nodes: ExampleItem[];
//     constructor( nodes: ExampleItem[]){
//     super();
//     this.nodes= nodes;

//     }
//     fetch(
//       tableState?: TableState,
//       tableRows?: TableRow<TreeItem>[]
//     ): Observable<Map<TableRow<TreeItem>, TreeItem[]>> {

//       tableRows?.reduce( (accumulator, row) => {
//       accumulator.set(row, this.nodes.map((child) => {
//         const treeItem:TreeItem = {
//               hasChildren: child.children!==undefined,
//               name: child.name,
//               children: child.children && new TableDataSource<TreeItem>(new PredfinedChildTableProviderExample(child.children))
//             }
//         return treeItem;
//       }))
//     return accumulator;
//   }, new Map<TableRow<TreeItem>, TreeItem[]>())
// }
// }

export class TableTreeDataProviderExample extends TableDataProvider<TreeItem> {
  items: TreeItem[] = ITEMS;
  totalItems = ITEMS.length;

  fetch(tableState?: TableState): Observable<TreeItem[]> {
    this.items = ITEMS;

    // apply searching
    if (tableState?.searchInput) {
      this.items = this.search(this.items, tableState);
    }

    this.totalItems = this.items.length;

    return of(
      this.items.map((child) => {
        return { ...child, hasChildren: child?.children !== undefined };
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

  // getFieldOptions(field: string): Observable<SelectItem<any>[]> {
  //   console.log(field);
  //   return this.fetch().pipe(
  //     take(1),
  //     map((data) => {
  //       const options: SelectItem[] = data
  //         .filter((item) => get(item, field) !== undefined)
  //         .map((item) => ({
  //           label: get(item, field),
  //           value: get(item, field),
  //         }));

  //       return options;
  //     })
  //   );
  // }
}

class ChildTableProvider extends TableChildrenDataProvider<TreeItem> {
  items: Map<TableRow<TreeItem>, TreeItem[]> = new Map();
  totalItems = 200;
  startIndex = 0;
  allItemsMap = new Map<TableRow<TreeItem>, TreeItem[]>();

  rowChildrenCount(row: TableRow<TreeItem>): Observable<number> {
    return of(this.totalItems);
  }

  /**
   * Unlike default dataSource, childDataSource accepts array of table rows as a second argument.
   * This is done to load child rows in bulk for the cases when multiple rows being expanded at the same time.
   * @param tableState
   * @param tableRows
   */
  fetch(
    tableState?: TableState,
    tableRows?: TableRow<TreeItem>[]
  ): Observable<Map<TableRow<TreeItem>, TreeItem[]>> {
    const itemsMap = new Map<TableRow<TreeItem>, TreeItem[]>();

    /** Logic of retrieving the child rows for a particular row in tableRows array. */
    tableRows?.forEach((row) => {
      let allItems = this.allItemsMap.get(row);
      const currentPage = tableState?.page.currentPage;
      if (!allItems) {
        allItems = ITEMS.find((x) => x.name == row.value.name)?.children?.map(
          (child) => {
            return {
              hasChildren: child?.children !== undefined,
              name: child.name,
            };
          }
        );
        this.allItemsMap.set(row, allItems);
      }

      // apply searching
      if (tableState?.searchInput) {
        allItems = this.search(allItems, tableState);
      }

      // // apply filtering
      // if (tableState?.filterBy) {
      //   allItems = this.filter(allItems, tableState);
      // }

      // Apply paging
      if (currentPage && tableState?.page) {
        const startIndex = (currentPage - 1) * tableState.page.pageSize;
        allItems = allItems.slice(
          startIndex,
          startIndex + tableState.page.pageSize
        );
      }

      itemsMap.set(row, allItems);
    });

    return of(itemsMap);
  }

  // private filter(items: TreeItem[], { filterBy }: TableState): TreeItem[] {
  //   filterBy
  //     .filter(({ field }) => !!field)
  //     .forEach((rule) => {
  //       items = items.filter((item) => {
  //         switch (rule.field) {
  //           case 'name':
  //           case 'description':
  //           case 'tags':
  //           case 'subtype':
  //           case 'writeAccess':
  //             return filterByString(item, rule as CollectionStringFilter);
  //           default:
  //             return false;
  //         }
  //       });
  //     });

  //   return items;
  // }

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

  // private sort(items: TreeItem[], { sortBy }: TableState): TreeItem[] {
  //   sortBy = sortBy.filter(({ field }) => !!field);

  //   if (sortBy.length === 0) {
  //     return items;
  //   }

  //   return items.sort(
  //     (a, b) =>
  //       sortBy
  //         .map(({ field, direction }) => {
  //           const ascModifier = direction === SortDirection.ASC ? 1 : -1;
  //           return sort(a, b, field as string) * ascModifier;
  //         })
  //         .find(
  //           (result, index, list) => result !== 0 || index === list.length - 1
  //         ) ?? 0
  //   );
  // }
}

/*
export class TableDataProviderExample extends TableDataProvider<ExampleItem> {
  items: ExampleItem[] = ITEMS;
  totalItems = ITEMS.length;
  selected = Selected;

  fetch(tableState?: TableState): Observable<ExampleItem[]> {
    this.items = ITEMS;

    // apply searching
    if (tableState?.searchInput) {
      this.items = this.search(this.items, tableState);
    }

    this.totalItems = this.items.length;

    return of(this.items);
  }

  search(
    items: ExampleItem[],
    { searchInput, columnKeys }: TableState
  ): ExampleItem[] {
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
*/
function getNestedValue<T extends Record<string, any>>(
  key: string,
  object: T
): any {
  return key.split('.').reduce((a, b) => (a ? a[b] : null), object);
}

// function get(item: ExampleItem,field: string):boolean? {
//      return Selected[item.name][field];
// }

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
