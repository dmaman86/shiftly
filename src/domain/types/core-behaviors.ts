// factory pattern
export interface Reducer<State, Input = State> {
  createEmpty(): State;
  accumulate(base: State, add: Input): State;
  subtract(base: State, sub: Input): State;
}

export interface Calculator<Input, Output> {
  calculate(params: Input): Output;
}

export interface Builder<Input, Output> {
  build(params: Input): Output;
}

export interface Resolver<Input, Output> {
  resolve(params: Input): Output;
}
