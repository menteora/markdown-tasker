import type { User } from './types';

export const INITIAL_USERS: User[] = [
    { name: 'Alice', alias: 'alice', email: 'alice@example.com', avatarUrl: 'https://picsum.photos/seed/alice/40/40' },
    { name: 'Bob', alias: 'bob', email: 'bob@example.com', avatarUrl: 'https://picsum.photos/seed/bob/40/40' },
    { name: 'Charlie', alias: 'charlie', email: 'charlie@example.com,engineering@example.com', avatarUrl: 'https://picsum.photos/seed/charlie/40/40' },
    { name: 'Diana', alias: 'diana', email: 'diana@example.com', avatarUrl: 'https://picsum.photos/seed/diana/40/40' },
    { name: 'Ethan', alias: 'ethan', email: 'ethan@example.com,product@example.com', avatarUrl: 'https://picsum.photos/seed/ethan/40/40' },
];
