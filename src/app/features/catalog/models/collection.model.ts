export interface ProductCollection {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly color: string | null;
  readonly icon: string | null;
  readonly parentId: string | null;
  readonly sortOrder: number;
  readonly isSystem: boolean;
}

export interface CollectionTreeItem extends ProductCollection {
  readonly childrenCount: number;
  readonly productCount: number;
}

export interface CollectionTreeNode extends CollectionTreeItem {
  readonly children: readonly CollectionTreeNode[];
}

export interface CollectionReorderEntry {
  readonly id: string;
  readonly parentId: string | null;
  readonly sortOrder: number;
}

export interface CreateCollectionRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly color?: string | null;
  readonly icon?: string | null;
  readonly parentId?: string | null;
  readonly sortOrder?: number;
}

export interface UpdateCollectionRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly color?: string | null;
  readonly icon?: string | null;
  readonly parentId?: string | null;
  readonly sortOrder: number;
}

export interface CollectionListQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
}

export interface CollectionOption {
  readonly id: string;
  readonly label: string;
  readonly parentId: string | null;
}
