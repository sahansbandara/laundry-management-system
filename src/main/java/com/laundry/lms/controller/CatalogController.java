package com.laundry.lms.controller;

import com.laundry.lms.service.CatalogService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/catalog")
@CrossOrigin("*")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/services")
    public List<String> getServices() {
        return catalogService.getServices();
    }

    @GetMapping("/units")
    public List<String> getUnits() {
        return catalogService.getUnits();
    }
}
