// Rebuild the pre-mobile commit with the same compiler, lock and demo config.
const {execFileSync}=require('node:child_process');
const {mkdtempSync,writeFileSync,readFileSync,symlinkSync,rmSync}=require('node:fs');
const path=require('node:path');
const cwd=process.cwd(),temp=mkdtempSync(path.join(require('node:os').tmpdir(),'cumbre20-mobile-base-'));
try {
 const archive=execFileSync('git',['archive','780ebf445a24dd8d557abcf8baeceb14c994b248'],{maxBuffer:50*1024*1024});
 execFileSync('tar',['-x','-C',temp],{input:archive});
 // Explicit desktop baseline change: the two-card Home uses one natural row.
 // Keep this expectation independent from the candidate and compare all pixels.
 const styles=path.join(temp,'src/styles.scss');
 const desktopHomeReference=`
@media (min-width: 1024px) {
  app-home .home-game-layout:has(> app-game-card:nth-child(2):last-child) {
    align-items: start;
    grid-template-rows: auto;
  }
  app-home .home-game-layout:has(> app-game-card:nth-child(2):last-child) > app-game-card:first-child {
    grid-row: auto;
  }
}
`;
 writeFileSync(styles,readFileSync(styles,'utf8')+desktopHomeReference);
 symlinkSync(path.join(cwd,'node_modules'),path.join(temp,'node_modules'),'dir');
 const file=path.join(temp,'angular.json'),config=JSON.parse(readFileSync(file));
 config.projects['rol-mendoza'].architect.build.configurations.mobileBaseline={optimization:{fonts:{inline:false}},outputPath:path.join(cwd,'dist/mobile-baseline'),fileReplacements:[{replace:'src/environments/environment.ts',with:'src/environments/environment.e2e.ts'}]};
 writeFileSync(file,JSON.stringify(config));
 execFileSync(process.execPath,[path.join(cwd,'node_modules/@angular/cli/bin/ng.js'),'build','--configuration=production,mobileBaseline'],{cwd:temp,stdio:'inherit'});
} finally {rmSync(temp,{recursive:true,force:true});}
