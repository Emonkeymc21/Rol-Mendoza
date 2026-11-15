// Rebuild the exact pre-mobile commit with the SAME compiler, lock and demo config.
const {execFileSync}=require('node:child_process');
const {mkdtempSync,writeFileSync,readFileSync,symlinkSync,rmSync}=require('node:fs');
const path=require('node:path');
const cwd=process.cwd(),temp=mkdtempSync(path.join(require('node:os').tmpdir(),'cumbre20-mobile-base-'));
try {
 const archive=execFileSync('git',['archive','780ebf445a24dd8d557abcf8baeceb14c994b248'],{maxBuffer:50*1024*1024});
 execFileSync('tar',['-x','-C',temp],{input:archive});
 symlinkSync(path.join(cwd,'node_modules'),path.join(temp,'node_modules'),'dir');
 const file=path.join(temp,'angular.json'),config=JSON.parse(readFileSync(file));
 config.projects['rol-mendoza'].architect.build.configurations.mobileBaseline={outputPath:path.join(cwd,'dist/mobile-baseline'),fileReplacements:[{replace:'src/environments/environment.ts',with:'src/environments/environment.e2e.ts'}]};
 writeFileSync(file,JSON.stringify(config));
 execFileSync(process.execPath,[path.join(cwd,'node_modules/@angular/cli/bin/ng.js'),'build','--configuration=production,mobileBaseline'],{cwd:temp,stdio:'inherit'});
} finally {rmSync(temp,{recursive:true,force:true});}
