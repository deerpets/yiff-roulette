{
  description = "A simple flake for Svelte development";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
        nodeEnv = pkgs.mkShell {
          buildInputs = [
            pkgs.nodejs
            pkgs.yarn
          ];
          shellHook = ''
            if [ ! -d "node_modules" ]; then
              echo "Installing Svelte and required packages..."
              yarn add svelte
            fi
          '';
        };
      in
      {
        devShells.default = nodeEnv;
      }
    );
}
