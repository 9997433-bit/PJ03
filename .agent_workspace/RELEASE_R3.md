# Round 3 Release: v2.0.0

Release page:

https://github.com/9997433-bit/PJ03/releases/tag/v2.0.0

## Downloads

| Asset | Download | SHA-256 |
| --- | --- | --- |
| Mortal Cultivation Simulator | [mortal-cultivation-simulator.zip](https://github.com/9997433-bit/PJ03/releases/download/v2.0.0/mortal-cultivation-simulator.zip) | `6b0f2ee2ef4bdb6149904f550639cba950669e59e205264e14c9f7fd1aefcc94` |
| Lanke Qiyuan Simulator | [lanke-qiyuan-simulator.zip](https://github.com/9997433-bit/PJ03/releases/download/v2.0.0/lanke-qiyuan-simulator.zip) | `c776885c34dbdfd2fcf44b1fa3c539da1f5522bb1c616905f6ca6eac538878da` |
| Mieyun Tulu Simulator | [mieyun-tulu-simulator.zip](https://github.com/9997433-bit/PJ03/releases/download/v2.0.0/mieyun-tulu-simulator.zip) | `abdb80da07d9437465cf668246c5670f755ed4dc8d8fcff1cb8bc591a60452f9` |
| Dao Jun Simulator | [dao-jun-simulator.zip](https://github.com/9997433-bit/PJ03/releases/download/v2.0.0/dao-jun-simulator.zip) | `59586498e15254d5d38e77b92ccec005c28ba3b6bf497fe4d55638341b068b7f` |
| Complete four-game bundle | [multi-novel-games-complete.zip](https://github.com/9997433-bit/PJ03/releases/download/v2.0.0/multi-novel-games-complete.zip) | `c24c7947cd85a75c28da962153c6fed8dad2c3ac8d45e80d2cfafc32c8217089` |
| Installation guide | [INSTALL.md](https://github.com/9997433-bit/PJ03/releases/download/v2.0.0/INSTALL.md) | `e1f1b9362bf0df1c295c2061722a86875fbc4019ce472a22d94af57132df0c4c` |

The complete bundle contains the four individual game archives, `INSTALL.md`,
`SHA256SUMS`, and a source pointer to:

https://github.com/9997433-bit/PJ03/tree/v2.0.0

## Validation

The release pipeline completed successfully:

```bash
scripts/build-all.sh &&
scripts/package-all.sh &&
scripts/validate-exports.mjs
```

Result: four games built, four archives packaged, and four static
`out/index.html` entry points validated. Every uploaded ZIP also passed
`unzip -t`.
