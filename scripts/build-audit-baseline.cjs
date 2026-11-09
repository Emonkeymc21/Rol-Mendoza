// Rebuild the pinned pre-change app with the same installed compiler and audit harness.
const {execFileSync}=require('node:child_process');
const {mkdtempSync,writeFileSync,readFileSync,symlinkSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');const path=require('node:path');
const cwd=process.cwd(), folder=mkdtempSync(path.join(tmpdir(),'cumbre20-baseline-'));
try{
 const archive=execFileSync('git',['archive','c733dd6694318d1b232272f383d52860805a4ec1'],{maxBuffer:50*1024*1024});
 execFileSync('tar',['-x','-C',folder],{input:archive});symlinkSync(path.join(cwd,'node_modules'),path.join(folder,'node_modules'),'dir');
 const file=path.join(folder,'angular.json'), config=JSON.parse(readFileSync(file));
 config.projects['rol-mendoza'].architect.build.configurations.audit={outputPath:{base:path.join(cwd,'dist/audit-baseline'),browser:''},fileReplacements:[{replace:'src/environments/environment.ts',with:'src/environments/environment.e2e.ts'}]};
 writeFileSync(file,JSON.stringify(config));
 execFileSync(process.execPath,[path.join(cwd,'node_modules/@angular/cli/bin/ng.js'),'build','--configuration=production,audit'],{cwd:folder,stdio:'inherit'});
}finally{rmSync(folder,{recursive:true,force:true});}
