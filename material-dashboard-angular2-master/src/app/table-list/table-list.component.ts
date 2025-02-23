import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as Papa from 'papaparse';

// Declare jQuery for the pop-up notifications
declare var $: any;

interface Supplier {
  identifiedSuppliers: string;
  industry: string;
  finalScore: number;
  linkedinPage: string;
  website: string;
  companySize: string;
  founded: string;
  locations: string;
  mentionedLinks: string;
  description?: string;
  showLinks?: boolean;      
  showLocations?: boolean; 
}

@Component({
  selector: 'app-table-list',
  templateUrl: './table-list.component.html',
  styleUrls: ['./table-list.component.css']
})
export class TableListComponent implements OnInit {

  CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vReAas3I3xWEHiz2DiGKnpBX7T72I60_WBrvKD6Xxr25IvoRJICezNT8TdheaHZJXZ4-Z68ax2jqch-/pub?gid=568022392&single=true&output=csv';
  
  suppliers: Supplier[] = [];

  // Pagination fields
  pageSize = 5;         // Number of rows per page
  currentPage = 1;      // Current page index (1-based)

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadCsvData();
  }

  loadCsvData(): void {
    this.http.get(this.CSV_URL, { responseType: 'text' }).subscribe(csvData => {
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          const data: Supplier[] = results.data.map((d: any) => ({
            identifiedSuppliers: d['Identified Suppliers'] || '',
            industry: d['Industry'] || '',
            finalScore: +d['Final Score'] || 0,
            linkedinPage: d['LinkedIn Page'] || '',
            website: d['Website'] || '',
            companySize: d['Company Size'] || '',
            founded: d['Founded'] || '',
            locations: d['Locations'] || '',
            mentionedLinks: d['Mentioned Links'] || '',
            description: d['Description'] || '',
            showLinks: false,
            showLocations: false
          }));
          // Filter out rows if needed
          this.suppliers = data.filter(s => s.founded && s.finalScore > 0);
        }
      });
    });
  }

  // Return how many pages in total
  get totalPages(): number {
    return Math.ceil(this.suppliers.length / this.pageSize);
  }

  // Return an array [1..totalPages] for the page links
  get pages(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }

  // Slice the suppliers array to get only the rows for the current page
  get paginatedSuppliers(): Supplier[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = this.currentPage * this.pageSize;
    return this.suppliers.slice(startIndex, endIndex);
  }

  // Navigate to a specific page
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Next page
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Previous page
  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Toggle the display of the "Mentioned Links"
  toggleLinks(supplier: Supplier): void {
    supplier.showLinks = !supplier.showLinks;
  }

  // Split "Mentioned Links" into an array
  getMentionedLinksArray(links: string): string[] {
    if (!links) return [];
    return links.split(';').map(link => link.trim()).filter(link => link);
  }

  // Toggle all locations
  toggleLocations(supplier: Supplier): void {
    supplier.showLocations = !supplier.showLocations;
  }

  // Return an array of all locations
  getLocationsArray(locations: string): string[] {
    if (!locations) return [];
    return locations.split(';').map(loc => loc.trim()).filter(loc => loc);
  }

  // Return the first location
  getFirstLocation(locations: string): string {
    const locs = this.getLocationsArray(locations);
    return locs.length ? locs[0] : '';
  }

  // Show the description in a jQuery $.notify pop-up
  showDescription(supplier: Supplier): void {
    const message = supplier.description?.trim() || 'No description available.';
    const chosenType = 'info';

    $.notify({
      icon: "info",
      message: message
    },{
      type: chosenType,
      timer: 4000,
      placement: {
        from: 'top',
        align: 'center'
      },
      template: 
        '<div data-notify="container" class="col-xl-4 col-lg-4 col-11 col-sm-4 col-md-4 alert alert-{0} alert-with-icon" role="alert">' +
          '<button type="button" aria-hidden="true" class="close" data-notify="dismiss">' +
            '<i class="material-icons">close</i>' +
          '</button>' +
          '<i class="material-icons" data-notify="icon">info</i> ' +
          '<span data-notify="title">{1}</span> ' +
          '<span data-notify="message">{2}</span>' +
          '<div class="progress" data-notify="progressbar">' +
            '<div class="progress-bar progress-bar-{0}" role="progressbar" style="width: 0%;"></div>' +
          '</div>' +
          '<a href="{3}" target="{4}" data-notify="url"></a>' +
        '</div>'
    });
  }
}
