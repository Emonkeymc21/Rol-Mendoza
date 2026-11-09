import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration, withNoIncrementalHydration } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi, withFetch } from '@angular/common/http';

import { SharedUiModule } from './shared/shared-ui.module';
import { AppRoutingModule } from './app-routing.module';
import { HomeComponent } from './pages/home/home.component';
import { AppComponent } from './app.component';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { IconComponent } from './shared/components/icon/icon.component';
import { CustomCursorComponent } from './shared/components/custom-cursor/custom-cursor.component';

@NgModule({ declarations: [
        AppComponent,
        HomeComponent,
        HeaderComponent,
        FooterComponent,
        CustomCursorComponent,
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        ReactiveFormsModule,
        SharedUiModule,
        IconComponent,
        AppRoutingModule], providers: [provideHttpClient(withFetch(), withInterceptorsFromDi()), provideClientHydration(withNoIncrementalHydration())] })
export class AppModule { }
