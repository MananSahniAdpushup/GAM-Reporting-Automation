type Data = any;

interface Storable {
  write(data: Data, storeIdentifier?: string): Promise<void>;
  read(storeIdentifier?: string): Promise<Data>;
  append(data: Data, storeIdentifier?: string): Promise<void>;
}

export type { Data, Storable };
