"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocale } from "@/context/locale-context";

type ValidatorFn = (value: string) => string | null;

interface UseEntryValidationOptions {
    extraValidators?: Record<string, ValidatorFn>;
}

export function useEntryValidation(options: UseEntryValidationOptions = {}) {
    const { t } = useLocale();
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const validationTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

    // Cleanup timeouts on unmount
    useEffect(() => {
        const timeouts = validationTimeouts.current;
        return () => {
            Object.values(timeouts).forEach(timeout => clearTimeout(timeout));
        };
    }, []);

    const validateField = useCallback((name: string, value: string): string | null => {
        // Check extra validators first
        if (options.extraValidators?.[name]) {
            return options.extraValidators[name](value);
        }

        switch (name) {
            case "year":
                if (value && (!/^\d+$/.test(value) || parseInt(value) < 1900 || parseInt(value) > 2100)) {
                    return t("invalidYear");
                }
                return null;
            case "comment":
                if (value.length > 1000) return t("commentTooLong");
                return null;
            case "currentSeason":
            case "currentEpisode":
            case "totalEpisodes":
                if (value && (!/^\d+$/.test(value) || parseInt(value) < 1)) {
                    return t("invalidNumber");
                }
                return null;
            case "hours":
                if (value && (!/^\d+$/.test(value) || parseInt(value) < 0)) {
                    return t("invalidNumber");
                }
                return null;
            case "minutes":
            case "seconds":
                if (value && (!/^\d+$/.test(value) || parseInt(value) < 0 || parseInt(value) > 59)) {
                    return t("invalidTimeComponent");
                }
                return null;
            default:
                return null;
        }
    }, [t, options.extraValidators]);

    const handleFieldChange = useCallback((name: string, value: string) => {
        if (validationTimeouts.current[name]) {
            clearTimeout(validationTimeouts.current[name]);
        }

        setValidationErrors(prev => {
            const next = { ...prev };
            delete next[name];
            return next;
        });

        validationTimeouts.current[name] = setTimeout(() => {
            const error = validateField(name, value);
            setValidationErrors(prev => {
                const next = { ...prev };
                if (error) {
                    next[name] = error;
                } else {
                    delete next[name];
                }
                return next;
            });
        }, 500);
    }, [validateField]);

    const validateAll = useCallback((fields: Array<{ name: string; value: string }>): Record<string, string> => {
        const errors: Record<string, string> = {};
        fields.forEach(({ name, value }) => {
            const error = validateField(name, value);
            if (error) {
                errors[name] = error;
            }
        });
        return errors;
    }, [validateField]);

    const resetValidation = useCallback(() => {
        Object.values(validationTimeouts.current).forEach(timeout => clearTimeout(timeout));
        setValidationErrors({});
    }, []);

    return {
        validationErrors,
        setValidationErrors,
        validateField,
        handleFieldChange,
        validateAll,
        resetValidation,
    };
}
