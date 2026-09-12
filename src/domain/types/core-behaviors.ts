export interface Reducer<State, Input = State> {
  createEmpty(): State;
  accumulate(base: State, add: Input): State;
  subtract(base: State, sub: Input): State;
}

/** A pure, dependency-free domain computation: input in, value out. */
export interface Calculator<Input, Output> {
  calculate(params: Input): Output;
}

/** Orchestrates multiple Calculators/Resolvers into one composite domain object. */
export interface Builder<Input, Output> {
  build(params: Input): Output;
}
