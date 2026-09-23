import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('@Public()', () => {
  it('sets the IS_PUBLIC_KEY metadata to true on a method', () => {
    class TestController {
      @Public()
      handler() {}
    }

    const reflector = new Reflector();
    const value = reflector.get(IS_PUBLIC_KEY, TestController.prototype.handler);
    expect(value).toBe(true);
  });

  it('sets the IS_PUBLIC_KEY metadata to true on a class', () => {
    @Public()
    class TestController {}

    const reflector = new Reflector();
    const value = reflector.get(IS_PUBLIC_KEY, TestController);
    expect(value).toBe(true);
  });

  it('leaves undecorated handlers without the metadata', () => {
    class TestController {
      handler() {}
    }

    const reflector = new Reflector();
    const value = reflector.get(IS_PUBLIC_KEY, TestController.prototype.handler);
    expect(value).toBeUndefined();
  });
});
