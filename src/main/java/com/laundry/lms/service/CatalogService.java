package com.laundry.lms.service;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CatalogService {

    private static final List<String> SERVICES = List.of(
            "Wash & Fold",
            "Dry Cleaning",
            "Ironing",
            "Express",
            "Stain Removal",
            "Bedding"
    );

    private static final List<String> UNITS = List.of(
            "Kg",
            "Items",
            "Sets"
    );

    public List<String> getServices() {
        return SERVICES;
    }

    public List<String> getUnits() {
        return UNITS;
    }

    public boolean isValidService(String value) {
        return value != null && SERVICES.contains(value);
    }

    public boolean isValidUnit(String value) {
        return value != null && UNITS.contains(value);
    }
}
