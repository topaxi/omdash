/**
 * Bind decorator, binds the function to the instance of the class
 */
export function bind() {
  return (_target: object, key: string, descriptor: PropertyDescriptor) => {
    const fn = descriptor.value;

    return {
      configurable: true,
      get() {
        const boundFn = fn.bind(this);

        Object.defineProperty(this, key, {
          value: boundFn,
          configurable: true,
          writable: true,
        });

        return boundFn;
      },
    };
  };
}
