export interface ParsedArgs {
  command: string;
  positional: string | undefined;
  extensions: string[] | undefined;
  exclude: string[] | undefined;
  output: string | undefined;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    command: '',
    positional: undefined,
    extensions: undefined,
    exclude: undefined,
    output: undefined,
  };

  const positionalArgs: string[] = [];
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--extension' || arg === '-e') {
      const value = argv[++i];
      if (value === undefined) throw new Error(`Missing value for ${arg}`);
      result.extensions = result.extensions ?? [];
      result.extensions.push(value.startsWith('.') ? value : `.${value}`);
    } else if (arg === '--exclude' || arg === '-x') {
      const value = argv[++i];
      if (value === undefined) throw new Error(`Missing value for ${arg}`);
      result.exclude = result.exclude ?? [];
      result.exclude.push(value);
    } else if (arg === '--output' || arg === '-o') {
      const value = argv[++i];
      if (value === undefined) throw new Error(`Missing value for ${arg}`);
      result.output = value;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positionalArgs.push(arg);
    }
    i++;
  }

  result.command = positionalArgs[0] ?? '';
  result.positional = positionalArgs[1];
  return result;
}
