import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill Request and Response for Next.js API routes
// Use Node.js built-in globals instead of next's edge runtime
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Define Request/Response classes for testing
// These are simple mocks for the API route tests
global.Request = class Request {
  constructor(
    public input: string | Request,
    public init?: RequestInit
  ) {}
  
  async json() {
    if (typeof this.input === 'string') {
      return JSON.parse(this.input);
    }
    return {};
  }
  
  async text() {
    if (typeof this.input === 'string') {
      return this.input;
    }
    return '';
  }
} as any;

global.Response = class Response {
  constructor(
    public body?: BodyInit | null,
    public init?: ResponseInit
  ) {}
  
  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }
  
  async text() {
    return typeof this.body === 'string' ? this.body : '';
  }
  
  static json(data: any, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  }
} as any;

global.Headers = class Headers {
  private map: Map<string, string> = new Map();
  
  constructor(init?: HeadersInit) {
    if (init) {
      if (init instanceof Headers) {
        init.forEach((value, key) => this.map.set(key, value));
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.map.set(key, value));
      } else {
        Object.entries(init).forEach(([key, value]) => this.map.set(key, value));
      }
    }
  }
  
  append(name: string, value: string) {
    this.map.set(name, value);
  }
  
  delete(name: string) {
    this.map.delete(name);
  }
  
  get(name: string) {
    return this.map.get(name) || null;
  }
  
  has(name: string) {
    return this.map.has(name);
  }
  
  set(name: string, value: string) {
    this.map.set(name, value);
  }
  
  forEach(callback: (value: string, key: string, parent: Headers) => void) {
    this.map.forEach((value, key) => callback(value, key, this));
  }
} as any;

// Mock next-auth
jest.mock('next-auth/react', () => ({
  ...jest.requireActual('next-auth/react'),
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
  usePathname: jest.fn(),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    team: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    boardColumn: {
      findMany: jest.fn(),
    },
  },
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));