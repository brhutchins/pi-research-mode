{
  description = "Pi research mode: a read-only exploration mode with pluggable research backends";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "aarch64-darwin"
        "x86_64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs_22
              pkgs.typescript
            ];

            shellHook = ''
              typecheck() { tsc -p tsconfig.json "$@"; }
              export -f typecheck

              echo "pi-research-mode dev shell"
              echo "  npm install    install Pi peer deps for typechecking"
              echo "  typecheck      run tsc -p tsconfig.json"
            '';
          };
        }
      );
    };
}
